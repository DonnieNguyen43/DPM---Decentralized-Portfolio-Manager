// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

interface IPriceOracle {
    function getLatestPrices() external view returns (int256[10] memory);
}

contract MockSwapRouter {
    address public priceOracle;
    address[10] public supportedTokens;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function setOracleAndTokens(address _priceOracle, address[10] calldata _tokens) external {
        priceOracle = _priceOracle;
        supportedTokens = _tokens;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut) {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        if (priceOracle != address(0)) {
            try IPriceOracle(priceOracle).getLatestPrices() returns (int256[10] memory prices) {
                uint256 priceIn = _getTokenPrice(params.tokenIn, prices);
                uint256 priceOut = _getTokenPrice(params.tokenOut, prices);

                if (priceIn > 0 && priceOut > 0) {
                    amountOut = (params.amountIn * priceIn) / priceOut;
                }
            } catch {}
        }

        if (amountOut < params.amountOutMinimum) {
            amountOut = params.amountOutMinimum > 0 ? params.amountOutMinimum : params.amountIn;
        }

        IMockERC20(params.tokenOut).mint(params.recipient, amountOut);
        return amountOut;
    }

    function _getTokenPrice(address token, int256[10] memory prices) internal view returns (uint256) {
        for (uint256 i = 0; i < 10; i++) {
            if (supportedTokens[i] == token) {
                return uint256(prices[i]);
            }
        }
        return 0;
    }
}
