export const PORTFOLIO_MANAGER_ADDRESS = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";
export const PRICE_ORACLE_ADDRESS = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";
export const USDT_ADDRESS = "0x68B1D87F95878fE05B998F19b66F4baba5De1aed";

export const TOKEN_ADDRESSES = {
  WBTC: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  WETH: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  SUI: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
  NEAR: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
  ARB: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  OP: "0x9A676e781A523b5d0C0e43731313A708CB607508",
  LINK: "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
  SOL: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  BNB: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  USDT: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
};

export const PRICE_FEED_ADDRESSES = {
  BTC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  ETH: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  SUI: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  NEAR: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  ARB: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  OP: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  LINK: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  SOL: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  BNB: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
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

// Asset-tiered drift tolerance thresholds
export const ASSET_DRIFT_TIERS = {
  // Tier 1: Mega-Cap Core (±2.5% warning, ±5.0% trigger)
  WBTC: { warn: 2.5, trigger: 5.0 },
  WETH: { warn: 2.5, trigger: 5.0 },

  // Tier 2: Large-Cap Layer 1 (±3.5% warning, ±7.0% trigger)
  SOL:  { warn: 3.5, trigger: 7.0 },
  BNB:  { warn: 3.5, trigger: 7.0 },

  // Tier 3: Growth & Mid-Cap (±5.0% warning, ±10.0% trigger)
  LINK: { warn: 5.0, trigger: 10.0 },
  SUI:  { warn: 5.0, trigger: 10.0 },
  NEAR: { warn: 5.0, trigger: 10.0 },

  // Tier 4: Satellite / High Volatility (±7.5% warning, ±15.0% trigger)
  ARB:  { warn: 7.5, trigger: 15.0 },
  OP:   { warn: 7.5, trigger: 15.0 },

  // Tier 5: Stablecoin Liquidity (±2.0% warning, ±5.0% trigger)
  USDT: { warn: 2.0, trigger: 5.0 },
};
