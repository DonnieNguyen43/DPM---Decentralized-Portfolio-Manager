export const PORTFOLIO_MANAGER_ADDRESS = "0x4Dd5336F3C0D70893A7a86c6aEBe9B953E87c891";
export const PRICE_ORACLE_ADDRESS = "0x5f246ADDCF057E0f778CD422e20e413be70f9a0c";
export const USDT_ADDRESS = "0xEC7cb8C3EBE77BA6d284F13296bb1372A8522c5F";

export const TOKEN_ADDRESSES = {
  WBTC: "0xb6057e08a11da09a998985874FE2119e98dB3D5D",
  WETH: "0xad203b3144f8c09a20532957174fc0366291643c",
  SUI: "0x31403b1e52051883f2Ce1B1b4C89f36034e1221D",
  NEAR: "0x4278C5d322aB92F1D876Dd7Bd9b44d1748b88af2",
  ARB: "0x0D92d35D311E54aB8EEA0394d7E773Fc5144491a",
  OP: "0x24EcC5E6EaA700368B8FAC259d3fBD045f695A08",
  LINK: "0x876939152C56362e17D508B9DEA77a3fDF9e4083",
  SOL: "0xD56e6F296352B03C3c3386543185E9B8c2e5Fd0b",
  USDT: "0xEC7cb8C3EBE77BA6d284F13296bb1372A8522c5F",
};

export const PRICE_FEED_ADDRESSES = {
  BTC: "0x8B342f4Ddcc71Af65e4D2dA9CD00cc0E945cFD12",
  ETH: "0xE2307e3710d108ceC7a4722a020a050681c835b3",
  SUI: "0xD28F3246f047Efd4059B24FA1fa587eD9fa3e77F",
  NEAR: "0x15F2ea83eB97ede71d84Bd04fFF29444f6b7cd52",
  ARB: "0x0B32a3F8f5b7E5d315b9E52E640a49A89d89c820",
  OP: "0xF357118EBd576f3C812c7875B1A1651a7f140E9C",
  LINK: "0x519b05b3655F4b89731B677d64CEcf761f4076f6",
  SOL: "0x057cD3082EfED32d5C907801BF3628B27D88fD80",
};

export const ASSET_SYMBOLS = ["WBTC", "WETH", "SUI", "NEAR", "ARB", "OP", "LINK", "SOL", "USDT"];
export const ASSET_COLORS = ["#F7931A", "#627EEA", "#4DA2FF", "#00C08B", "#28A0F0", "#FF0420", "#375BD2", "#14F195", "#26A17B"];

export const DEPOSIT_SYMBOLS = ["WBTC", "WETH", "SUI", "NEAR", "ARB", "OP", "LINK", "SOL", "USDT"];
export const EXTENDED_ASSET_SYMBOLS = ["WBTC", "WETH", "SUI", "NEAR", "ARB", "OP", "LINK", "SOL"];

export const BINANCE_SYMBOLS = {
  WBTC: "BTCUSDT",
  WETH: "ETHUSDT",
  SUI: "SUIUSDT",
  NEAR: "NEARUSDT",
  ARB: "ARBUSDT",
  OP: "OPUSDT",
  LINK: "LINKUSDT",
  SOL: "SOLUSDT",
};

export const EXTENDED_ASSET_COLORS = {
  WBTC: "#F7931A",
  WETH: "#627EEA",
  SUI: "#4DA2FF",
  NEAR: "#00C08B",
  ARB: "#28A0F0",
  OP: "#FF0420",
  LINK: "#375BD2",
  SOL: "#14F195",
  USDT: "#26A17B",
};

export const PORTFOLIO_MANAGER_ABI = [
  "function deposit(uint256 assetIndex, uint256 amount) external",
  "function withdraw(uint256 assetIndex, uint256 amount) external",
  "function setTargetAllocation(uint256[9] allocations) external",
  "function executeRebalance() external",
  "function executeRebalanceFor(address user) external",
  "function getInvestorBalances(address user) external view returns (uint256[9])",
  "function getTargetAllocations(address user) external view returns (uint256[9])",
  "function getPortfolioValue(address user) external view returns (uint256 totalUsd, uint256[9] assetValuesUsd)",
  "function supportedTokens(uint256) external view returns (address)",
  "event Deposited(address indexed user, uint256 indexed assetIndex, uint256 amount)",
  "event AllocationSet(address indexed user, uint256[9] allocations)",
  "event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
];

export const PRICE_ORACLE_ABI = [
  "function getLatestPrices() external view returns (int256[9])",
  "function checkDeviation(uint256[9] calldata balances, uint256[9] calldata targetAllocations, uint256 thresholdBps) external view returns (bool)",
];

export const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];
