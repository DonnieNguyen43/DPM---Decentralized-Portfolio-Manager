import { useState, useCallback } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import { useToast } from "./shared/Toast";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4"/>
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
    <circle cx="18" cy="12" r="2"/>
  </svg>
);

const LogOutIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const SwitchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>
);

// ─── Network Config ───────────────────────────────────────────────────────────
const NETWORK_CONFIG = {
  10:        { label: "Optimism",        cssClass: "optimism",  symbol: "🔴" },
  1:         { label: "Ethereum",        cssClass: "ethereum",  symbol: "🔷" },
  11155111:  { label: "Sepolia",         cssClass: "localhost", symbol: "🟡" },
  31337:     { label: "Localhost",       cssClass: "localhost", symbol: "🟡" },
  1337:      { label: "Localhost",       cssClass: "localhost", symbol: "🟡" },
};

const ALLOWED_CHAIN_IDS = [10, 31337, 1337, 11155111];

function getNetworkInfo(chainId) {
  if (!chainId) return { label: "Unknown", cssClass: "unknown", symbol: "⚫" };
  return NETWORK_CONFIG[Number(chainId)] ?? { label: `Chain ${chainId}`, cssClass: "unknown", symbol: "⚫" };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletConnect() {
  const { account, nativeBalance, connectWallet, disconnectWallet, chainId } = usePortfolio();
  const { toastError } = useToast();

  const [copied, setCopied] = useState(false);

  const handleConnect = useCallback(async () => {
    try {
      await connectWallet();
    } catch (err) {
      toastError("Wallet Connection Failed", {
        message: err?.message || "Could not connect wallet. Please install MetaMask.",
      });
      console.warn("connectWallet error:", err);
    }
  }, [connectWallet, toastError]);

  const truncatedAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  const handleCopy = useCallback(async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
    }
  }, [account]);

  const handleSwitchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      });
    } catch (err) {
      console.warn("Network switch failed:", err);
    }
  }, []);

  // ── Disconnected state ──
  if (!account) {
    return (
      <button id="btn-connect-wallet" className="wallet-btn" onClick={handleConnect}>
        <span className="wallet-btn-icon">
          <WalletIcon />
        </span>
        Connect Wallet
      </button>
    );
  }

  const networkInfo = getNetworkInfo(chainId);
  const isWrongNetwork = chainId && !ALLOWED_CHAIN_IDS.includes(Number(chainId));
  const ethBalance = parseFloat(nativeBalance || "0").toFixed(4);

  // ── Connected state ──
  return (
    <div className="wallet-info" role="status" aria-label="Wallet connected">
      {/* Network Badge */}
      {isWrongNetwork ? (
        <button
          className="wrong-network-btn"
          onClick={handleSwitchNetwork}
          title="Click to switch to Optimism"
        >
          <SwitchIcon />
          Wrong Network
        </button>
      ) : (
        <div className={`network-badge ${networkInfo.cssClass}`} title={`Connected to ${networkInfo.label}`}>
          <span className="network-dot" />
          <span className="network-label">{networkInfo.label}</span>
        </div>
      )}

      {/* Address Pill */}
      <div className="wallet-address-pill">
        <span className="wallet-dot" aria-hidden="true" />
        <span id="wallet-address" className="wallet-address" title={account}>
          {truncatedAddress}
        </span>
        <button
          className={`wallet-copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy full address"}
          aria-label={copied ? "Address copied" : "Copy wallet address"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      {/* ETH Balance */}
      <span id="native-balance" className="wallet-balance-chip">
        {ethBalance} ETH
      </span>

      {/* Disconnect */}
      <button
        id="btn-disconnect"
        className="wallet-disconnect-btn"
        onClick={disconnectWallet}
        title="Disconnect wallet"
      >
        <LogOutIcon />
        Disconnect
      </button>
    </div>
  );
}
