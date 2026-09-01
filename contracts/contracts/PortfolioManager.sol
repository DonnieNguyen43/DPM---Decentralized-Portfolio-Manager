// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/AggregatorV3Interface.sol";

contract PortfolioManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant NUM_ASSETS = 10;
    uint256 public constant BASIS_POINTS = 10000;
    uint24 public constant POOL_FEE = 3000;
    uint256 public constant SLIPPAGE_BPS = 100;

    address public immutable owner;
    ISwapRouter public immutable swapRouter;
    address public priceOracle;

    address[NUM_ASSETS] public supportedTokens;

    struct InvestorInfo {
        uint256[NUM_ASSETS] balances;
        uint256[NUM_ASSETS] targetAllocations;
        bool active;
    }

    mapping(address => InvestorInfo) internal investors;

    event Deposited(address indexed user, uint256 indexed assetIndex, uint256 amount);
    event AllocationSet(address indexed user, uint256[NUM_ASSETS] allocations);
    event SwapExecuted(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(
        address _swapRouter,
        address _priceOracle,
        address[NUM_ASSETS] memory _tokens
    ) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        priceOracle = _priceOracle;
        supportedTokens = _tokens;
    }

    function setPriceOracle(address _oracle) external onlyOwner {
        priceOracle = _oracle;
    }

    function deposit(uint256 assetIndex, uint256 amount) external nonReentrant {
        require(assetIndex < NUM_ASSETS, "INVALID_ASSET");
        require(amount > 0, "ZERO_AMOUNT");

        IERC20(supportedTokens[assetIndex]).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        investors[msg.sender].balances[assetIndex] += amount;
        investors[msg.sender].active = true;

        emit Deposited(msg.sender, assetIndex, amount);
    }

    function withdraw(uint256 assetIndex, uint256 amount) external nonReentrant {
        require(assetIndex < NUM_ASSETS, "INVALID_ASSET");
        require(investors[msg.sender].balances[assetIndex] >= amount, "INSUFFICIENT");

        investors[msg.sender].balances[assetIndex] -= amount;

        IERC20(supportedTokens[assetIndex]).safeTransfer(msg.sender, amount);
    }

    function setTargetAllocation(uint256[NUM_ASSETS] calldata allocations) external {
        uint256 total;
        for (uint256 i; i < NUM_ASSETS; ++i) {
            total += allocations[i];
        }
        require(total == BASIS_POINTS, "MUST_EQUAL_10000");

        investors[msg.sender].targetAllocations = allocations;
        investors[msg.sender].active = true;

        emit AllocationSet(msg.sender, allocations);
    }

    function executeRebalance() external nonReentrant {
        _rebalanceFor(msg.sender);
    }

    function executeRebalanceWithPrices(int256[NUM_ASSETS] calldata livePrices) external nonReentrant {
        if (priceOracle != address(0)) {
            int256[9] memory feedPrices;
            for (uint256 i = 0; i < 9; i++) {
                feedPrices[i] = livePrices[i];
            }
            (bool ok, ) = priceOracle.call(
                abi.encodeWithSignature("updateFeedPrices(int256[9])", feedPrices)
            );
            ok; // silent fallback
        }
        _rebalanceFor(msg.sender);
    }

    function executeRebalanceWithAllocationsAndPrices(
        uint256[NUM_ASSETS] calldata allocations,
        int256[NUM_ASSETS] calldata livePrices
    ) external nonReentrant {
        uint256 totalAlloc;
        for (uint256 i; i < NUM_ASSETS; ++i) {
            totalAlloc += allocations[i];
        }
        if (totalAlloc == BASIS_POINTS) {
            investors[msg.sender].targetAllocations = allocations;
            investors[msg.sender].active = true;
            emit AllocationSet(msg.sender, allocations);
        }

        if (priceOracle != address(0)) {
            int256[9] memory feedPrices;
            for (uint256 i = 0; i < 9; i++) {
                feedPrices[i] = livePrices[i];
            }
            (bool ok, ) = priceOracle.call(
                abi.encodeWithSignature("updateFeedPrices(int256[9])", feedPrices)
            );
            ok;
        }

        _rebalanceFor(msg.sender);
    }

    function executeRebalanceFor(address user) external nonReentrant {
        _rebalanceFor(user);
    }

    function _rebalanceFor(address user) internal {
        InvestorInfo storage inv = investors[user];
        require(inv.active, "NO_POSITION");

        int256[NUM_ASSETS] memory prices = _getPrices();

        uint256 totalValueUsd;
        uint256[NUM_ASSETS] memory assetValuesUsd;

        for (uint256 i; i < NUM_ASSETS; ++i) {
            assetValuesUsd[i] = (inv.balances[i] * uint256(prices[i])) / 1e8;
            totalValueUsd += assetValuesUsd[i];
        }
        require(totalValueUsd > 0, "ZERO_PORTFOLIO");

        for (uint256 i; i < NUM_ASSETS; ++i) {
            uint256 targetValueUsd = (totalValueUsd * inv.targetAllocations[i]) / BASIS_POINTS;

            while (assetValuesUsd[i] > targetValueUsd + 1e4) {
                uint256 excessUsd = assetValuesUsd[i] - targetValueUsd;
                (uint256 bestDeficitIndex, uint256 maxDeficitUsd) = _findLargestDeficit(
                    assetValuesUsd,
                    inv.targetAllocations,
                    totalValueUsd,
                    i
                );

                if (bestDeficitIndex == i || maxDeficitUsd == 0) break;

                uint256 swapUsd = excessUsd < maxDeficitUsd ? excessUsd : maxDeficitUsd;
                if (swapUsd == 0) break;

                uint256 sellAmount = (swapUsd * 1e8) / uint256(prices[i]);
                if (sellAmount == 0) break;
                if (sellAmount > inv.balances[i]) {
                    sellAmount = inv.balances[i];
                }

                uint256 expectedOut = (swapUsd * 1e8) / uint256(prices[bestDeficitIndex]);
                uint256 minOut = (expectedOut * (BASIS_POINTS - SLIPPAGE_BPS)) / BASIS_POINTS;

                IERC20(supportedTokens[i]).approve(address(swapRouter), sellAmount);

                uint256 amountOut = swapRouter.exactInputSingle(
                    ISwapRouter.ExactInputSingleParams({
                        tokenIn: supportedTokens[i],
                        tokenOut: supportedTokens[bestDeficitIndex],
                        fee: POOL_FEE,
                        recipient: address(this),
                        deadline: block.timestamp + 300,
                        amountIn: sellAmount,
                        amountOutMinimum: minOut,
                        sqrtPriceLimitX96: 0
                    })
                );

                inv.balances[i] -= sellAmount;
                inv.balances[bestDeficitIndex] += amountOut;

                uint256 soldUsd = (sellAmount * uint256(prices[i])) / 1e8;
                uint256 boughtUsd = (amountOut * uint256(prices[bestDeficitIndex])) / 1e8;

                if (assetValuesUsd[i] >= soldUsd) {
                    assetValuesUsd[i] -= soldUsd;
                } else {
                    assetValuesUsd[i] = 0;
                }
                assetValuesUsd[bestDeficitIndex] += boughtUsd;

                emit SwapExecuted(
                    user,
                    supportedTokens[i],
                    supportedTokens[bestDeficitIndex],
                    sellAmount,
                    amountOut
                );
            }
        }
    }

    function _findLargestDeficit(
        uint256[NUM_ASSETS] memory assetValuesUsd,
        uint256[NUM_ASSETS] storage targetAllocations,
        uint256 totalValueUsd,
        uint256 excludeIndex
    ) internal view returns (uint256 bestIndex, uint256 maxDeficitUsd) {
        maxDeficitUsd = 0;
        bestIndex = excludeIndex;
        for (uint256 i; i < NUM_ASSETS; ++i) {
            if (i == excludeIndex) continue;
            uint256 targetVal = (totalValueUsd * targetAllocations[i]) / BASIS_POINTS;
            if (targetVal > assetValuesUsd[i]) {
                uint256 deficit = targetVal - assetValuesUsd[i];
                if (deficit > maxDeficitUsd) {
                    maxDeficitUsd = deficit;
                    bestIndex = i;
                }
            }
        }
        return (bestIndex, maxDeficitUsd);
    }

    function _getPrices() internal view returns (int256[NUM_ASSETS] memory) {
        (bool success, bytes memory data) = priceOracle.staticcall(
            abi.encodeWithSignature("getLatestPrices()")
        );
        require(success, "ORACLE_CALL_FAILED");
        return abi.decode(data, (int256[10]));
    }

    function getInvestorBalances(address user)
        external
        view
        returns (uint256[NUM_ASSETS] memory)
    {
        return investors[user].balances;
    }

    function getTargetAllocations(address user)
        external
        view
        returns (uint256[NUM_ASSETS] memory)
    {
        return investors[user].targetAllocations;
    }

    function getPortfolioValue(address user)
        external
        view
        returns (uint256 totalUsd, uint256[NUM_ASSETS] memory assetValuesUsd)
    {
        int256[NUM_ASSETS] memory prices = _getPrices();
        for (uint256 i; i < NUM_ASSETS; ++i) {
            assetValuesUsd[i] =
                (investors[user].balances[i] * uint256(prices[i])) / 1e8;
            totalUsd += assetValuesUsd[i];
        }
    }
}
