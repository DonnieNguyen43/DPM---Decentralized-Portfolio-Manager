export const PORTFOLIO_MANAGER_ADDRESS = "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2";
export const PRICE_ORACLE_ADDRESS = "0x4C4a2f8c81640e47606d3fd77B353E87Ba015584";
export const USDT_ADDRESS = "0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6";

export const TOKEN_ADDRESSES = {
  WBTC: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
  WETH: "0xFD471836031dc5108809D173A067e8486B9047A3",
  SUI: "0xcbEAF3BDe82155F56486Fb5a1072cb8baAf547cc",
  NEAR: "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f",
  ARB: "0xB0D4afd8879eD9F52b28595d31B441D079B2Ca07",
  OP: "0x162A433068F51e18b7d13932F27e66a3f99E6890",
  LINK: "0x922D6956C99E12DFeB3224DEA977D0939758A1Fe",
  SOL: "0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f",
  BNB: "0x1fA02b2d6A771842690194Cf62D91bdd92BfE28d",
  USDT: "0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6",
};

export const PRICE_FEED_ADDRESSES = {
  BTC: "0x4c5859f0F772848b2D91F1D83E2Fe57935348029",
  ETH: "0x1291Be112d480055DaFd8a610b7d1e203891C274",
  SUI: "0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154",
  NEAR: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575",
  ARB: "0xCD8a1C3ba11CF5ECfa6267617243239504a98d90",
  OP: "0x82e01223d51Eb87e16A03E24687EDF0F294da6f1",
  LINK: "0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3",
  SOL: "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0",
  BNB: "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650",
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
