import { usePortfolio } from "../hooks/usePortfolio";

export default function WalletConnect() {
  const { account, nativeBalance, connectWallet, disconnectWallet } = usePortfolio();

  const truncatedAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  if (!account) {
    return (
      <button id="btn-connect-wallet" className="wallet-btn" onClick={connectWallet}>
        <span className="wallet-btn-icon">⬡</span>
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="wallet-info">
      <div className="wallet-address-group">
        <span className="wallet-dot"></span>
        <span id="wallet-address" className="wallet-address">{truncatedAddress}</span>
      </div>
      <div className="wallet-balance">
        <span id="native-balance">{parseFloat(nativeBalance).toFixed(4)}</span> ETH
      </div>
      <button id="btn-disconnect" className="wallet-btn wallet-btn-disconnect" onClick={disconnectWallet}>
        Disconnect
      </button>
    </div>
  );
}
