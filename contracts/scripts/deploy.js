const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    const MockAggregator = await hre.ethers.getContractFactory("MockAggregator");
    const btcFeed = await MockAggregator.deploy(7700000000000);
    await btcFeed.waitForDeployment();
    const ethFeed = await MockAggregator.deploy(240000000000);
    await ethFeed.waitForDeployment();
    const suiFeed = await MockAggregator.deploy(75000000);
    await suiFeed.waitForDeployment();
    const nearFeed = await MockAggregator.deploy(180000000);
    await nearFeed.waitForDeployment();
    const arbFeed = await MockAggregator.deploy(55000000);
    await arbFeed.waitForDeployment();
    const opFeed = await MockAggregator.deploy(160000000);
    await opFeed.waitForDeployment();
    const linkFeed = await MockAggregator.deploy(1400000000);
    await linkFeed.waitForDeployment();
    const solFeed = await MockAggregator.deploy(13500000000);
    await solFeed.waitForDeployment();
    const bnbFeed = await MockAggregator.deploy(58000000000);
    await bnbFeed.waitForDeployment();

    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const supply = hre.ethers.parseUnits("1000000", 18);

    const wbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 18, supply);
    await wbtc.waitForDeployment();
    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18, supply);
    await weth.waitForDeployment();
    const sui = await MockERC20.deploy("Sui Token", "SUI", 18, supply);
    await sui.waitForDeployment();
    const near = await MockERC20.deploy("NEAR Protocol", "NEAR", 18, supply);
    await near.waitForDeployment();
    const arb = await MockERC20.deploy("Arbitrum", "ARB", 18, supply);
    await arb.waitForDeployment();
    const op = await MockERC20.deploy("Optimism", "OP", 18, supply);
    await op.waitForDeployment();
    const link = await MockERC20.deploy("Chainlink", "LINK", 18, supply);
    await link.waitForDeployment();
    const sol = await MockERC20.deploy("Solana Token", "SOL", 18, supply);
    await sol.waitForDeployment();
    const bnb = await MockERC20.deploy("Binance Coin", "BNB", 18, supply);
    await bnb.waitForDeployment();
    const usdt = await MockERC20.deploy("Tether USD", "USDT", 18, supply);
    await usdt.waitForDeployment();

    const MockSwapRouter = await hre.ethers.getContractFactory("MockSwapRouter");
    const swapRouter = await MockSwapRouter.deploy();
    await swapRouter.waitForDeployment();

    const feedsArray = [
        await btcFeed.getAddress(),
        await ethFeed.getAddress(),
        await suiFeed.getAddress(),
        await nearFeed.getAddress(),
        await arbFeed.getAddress(),
        await opFeed.getAddress(),
        await linkFeed.getAddress(),
        await solFeed.getAddress(),
        await bnbFeed.getAddress(),
    ];

    const tokensArray = [
        await wbtc.getAddress(),
        await weth.getAddress(),
        await sui.getAddress(),
        await near.getAddress(),
        await arb.getAddress(),
        await op.getAddress(),
        await link.getAddress(),
        await sol.getAddress(),
        await bnb.getAddress(),
        await usdt.getAddress(),
    ];

    const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(feedsArray);
    await priceOracle.waitForDeployment();

    await swapRouter.setOracleAndTokens(
        await priceOracle.getAddress(),
        tokensArray
    );

    const PortfolioManager = await hre.ethers.getContractFactory("PortfolioManager");
    const portfolioManager = await PortfolioManager.deploy(
        await swapRouter.getAddress(),
        await priceOracle.getAddress(),
        tokensArray
    );
    await portfolioManager.waitForDeployment();

    const pmAddress = await portfolioManager.getAddress();

    // Mint test tokens to deployer
    await usdt.mint(deployer.address, hre.ethers.parseEther("100000"));
    await wbtc.mint(deployer.address, hre.ethers.parseEther("2"));
    await weth.mint(deployer.address, hre.ethers.parseEther("20"));
    await sui.mint(deployer.address, hre.ethers.parseEther("500"));
    await near.mint(deployer.address, hre.ethers.parseEther("500"));
    await arb.mint(deployer.address, hre.ethers.parseEther("1000"));
    await op.mint(deployer.address, hre.ethers.parseEther("500"));
    await link.mint(deployer.address, hre.ethers.parseEther("200"));
    await sol.mint(deployer.address, hre.ethers.parseEther("50"));
    await bnb.mint(deployer.address, hre.ethers.parseEther("10"));

    // Approve PortfolioManager
    await usdt.approve(pmAddress, hre.ethers.parseEther("100000"));
    await wbtc.approve(pmAddress, hre.ethers.parseEther("2"));
    await weth.approve(pmAddress, hre.ethers.parseEther("20"));
    await sui.approve(pmAddress, hre.ethers.parseEther("500"));
    await near.approve(pmAddress, hre.ethers.parseEther("500"));
    await arb.approve(pmAddress, hre.ethers.parseEther("1000"));
    await op.approve(pmAddress, hre.ethers.parseEther("500"));
    await link.approve(pmAddress, hre.ethers.parseEther("200"));
    await sol.approve(pmAddress, hre.ethers.parseEther("50"));
    await bnb.approve(pmAddress, hre.ethers.parseEther("10"));

    // Deposit initial portfolio: USDT 100, WBTC 0.0025, WETH 0.08, SOL 1.48, BNB 0.34
    await portfolioManager.deposit(9, hre.ethers.parseEther("100")); // USDT
    await portfolioManager.deposit(0, hre.ethers.parseEther("0.0025")); // WBTC
    await portfolioManager.deposit(1, hre.ethers.parseEther("0.08")); // WETH
    await portfolioManager.deposit(7, hre.ethers.parseEther("1.48")); // SOL
    await portfolioManager.deposit(8, hre.ethers.parseEther("0.34")); // BNB

    // Set initial target allocations on-chain: WBTC 20%, WETH 15%, SOL 15%, BNB 10%, USDT 40%
    const initialTargets = [2000, 1500, 0, 0, 0, 0, 0, 1500, 1000, 4000];
    await portfolioManager.setTargetAllocation(initialTargets);

    const addresses = {
        portfolioManager: pmAddress,
        priceOracle: await priceOracle.getAddress(),
        wbtc: await wbtc.getAddress(),
        weth: await weth.getAddress(),
        sui: await sui.getAddress(),
        near: await near.getAddress(),
        arb: await arb.getAddress(),
        op: await op.getAddress(),
        link: await link.getAddress(),
        sol: await sol.getAddress(),
        bnb: await bnb.getAddress(),
        usdt: await usdt.getAddress(),
    };

    const configContent = `export const PORTFOLIO_MANAGER_ADDRESS = "${addresses.portfolioManager}";
export const PRICE_ORACLE_ADDRESS = "${addresses.priceOracle}";
export const USDT_ADDRESS = "${addresses.usdt}";

export const TOKEN_ADDRESSES = {
  WBTC: "${addresses.wbtc}",
  WETH: "${addresses.weth}",
  SUI: "${addresses.sui}",
  NEAR: "${addresses.near}",
  ARB: "${addresses.arb}",
  OP: "${addresses.op}",
  LINK: "${addresses.link}",
  SOL: "${addresses.sol}",
  BNB: "${addresses.bnb}",
  USDT: "${addresses.usdt}",
};

export const PRICE_FEED_ADDRESSES = {
  BTC: "${await btcFeed.getAddress()}",
  ETH: "${await ethFeed.getAddress()}",
  SUI: "${await suiFeed.getAddress()}",
  NEAR: "${await nearFeed.getAddress()}",
  ARB: "${await arbFeed.getAddress()}",
  OP: "${await opFeed.getAddress()}",
  LINK: "${await linkFeed.getAddress()}",
  SOL: "${await solFeed.getAddress()}",
  BNB: "${await bnbFeed.getAddress()}",
};

export const ASSET_SYMBOLS = ["WBTC", "WETH", "SUI", "NEAR", "ARB", "OP", "LINK", "SOL", "BNB", "USDT"];
export const ASSET_COLORS = ["#F7931A", "#8B5CF6", "#06B6D4", "#10B981", "#3B82F6", "#EF4444", "#1E40AF", "#D946EF", "#F59E0B", "#14B8A6"];

export const DEPOSIT_SYMBOLS = ["WBTC", "WETH", "SUI", "NEAR", "ARB", "OP", "LINK", "SOL", "BNB", "USDT"];
export const EXTENDED_ASSET_SYMBOLS = ["WBTC", "WETH", "SUI", "NEAR", "ARB", "OP", "LINK", "SOL", "BNB"];

export const BINANCE_SYMBOLS = {
  WBTC: "BTCUSDT",
  WETH: "ETHUSDT",
  SUI: "SUIUSDT",
  NEAR: "NEARUSDT",
  ARB: "ARBUSDT",
  OP: "OPUSDT",
  LINK: "LINKUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
};

export const EXTENDED_ASSET_COLORS = {
  WBTC: "#F7931A",
  WETH: "#8B5CF6",
  SUI: "#06B6D4",
  NEAR: "#10B981",
  ARB: "#3B82F6",
  OP: "#EF4444",
  LINK: "#1E40AF",
  SOL: "#D946EF",
  BNB: "#F59E0B",
  USDT: "#14B8A6",
};

export const PORTFOLIO_MANAGER_ABI = [
  "function deposit(uint256 assetIndex, uint256 amount) external",
  "function withdraw(uint256 assetIndex, uint256 amount) external",
  "function setTargetAllocation(uint256[10] allocations) external",
  "function executeRebalance() external",
  "function executeRebalanceFor(address user) external",
  "function getInvestorBalances(address user) external view returns (uint256[10])",
  "function getTargetAllocations(address user) external view returns (uint256[10])",
  "function getPortfolioValue(address user) external view returns (uint256 totalUsd, uint256[10] assetValuesUsd)",
  "function supportedTokens(uint256) external view returns (address)",
  "event Deposited(address indexed user, uint256 indexed assetIndex, uint256 amount)",
  "event AllocationSet(address indexed user, uint256[10] allocations)",
  "event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
];

export const PRICE_ORACLE_ABI = [
  "function getLatestPrices() external view returns (int256[10])",
  "function checkDeviation(uint256[10] calldata balances, uint256[10] calldata targetAllocations, uint256 thresholdBps) external view returns (bool)",
];

export const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];
`;

    const configPath = path.resolve(__dirname, "../../frontend/src/config/contracts.js");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, configContent, "utf-8");

    console.log("Deployer:", deployer.address);
    console.log("USDT Token:", addresses.usdt);
    console.log("PortfolioManager deployed to:", addresses.portfolioManager);
    console.log("Frontend config written to:", configPath);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});