export const HARDHAT_CHAIN_ID = 31337;

export const HARDHAT_NETWORK = {
  chainId: `0x${HARDHAT_CHAIN_ID.toString(16)}`,
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: [],
};
