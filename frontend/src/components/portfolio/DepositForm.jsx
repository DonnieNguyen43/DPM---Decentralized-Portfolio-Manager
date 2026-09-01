import { useState } from "react";
import { ethers } from "ethers";
import { ASSET_SYMBOLS } from "../../config/contracts";
import { useToast } from "../shared/Toast";

// ─── Deposit Form ─────────────────────────────────────────────────────────────
export default function DepositForm({ deposit }) {
  const [depositAsset, setDepositAsset] = useState("WBTC");
  const [depositAmount, setDepositAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toastSuccess, toastError, toastPending, updateToast } = useToast();

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toastError("Invalid Amount", { message: "Please enter a valid deposit amount." });
      return;
    }

    const pendingId = toastPending(`Depositing ${depositAmount} ${depositAsset}…`, {
      message: "Awaiting MetaMask confirmation",
    });

    setLoading(true);
    try {
      const amount = ethers.parseUnits(depositAmount, 18);
      const tx = await deposit(depositAsset, amount);

      updateToast(pendingId, {
        type: "success",
        title: `Deposited ${depositAmount} ${depositAsset}`,
        message: "Transaction confirmed successfully.",
        txHash: tx?.hash,
        explorerUrl: "https://optimistic.etherscan.io",
      });

      setDepositAmount("");
    } catch (err) {
      const msg = err?.shortMessage || err?.reason || err?.info?.error?.message || err?.message || "";
      const isRejected = msg.includes("user rejected") || msg.includes("ACTION_REJECTED") || err?.code === 4001;

      if (!isRejected) {
        let displayMsg = err?.shortMessage || err?.reason || (msg.length > 100 ? msg.slice(0, 100) + "..." : msg);
        if (msg.includes("ERC20InsufficientBalance") || msg.includes("insufficient balance") || msg.includes("Insufficient")) {
          displayMsg = `Insufficient ${depositAsset} balance in your wallet.`;
        }
        updateToast(pendingId, {
          type: "error",
          title: "Deposit Failed",
          message: displayMsg || "Transaction failed. Please check ETH balance for gas.",
        });
      } else {
        updateToast(pendingId, {
          type: "warn",
          title: "Deposit Cancelled",
          message: "You rejected the transaction in MetaMask.",
        });
      }
      console.error("Deposit failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">Deposit (Zap-in)</h3>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
        Deposit a single token — the protocol will auto-allocate it across your target portfolio.
      </p>
      <div className="input-group">
        <select
          id="select-deposit-asset"
          value={depositAsset}
          onChange={(e) => setDepositAsset(e.target.value)}
          className="input-select"
          disabled={loading}
          aria-label="Select token to deposit"
        >
          {ASSET_SYMBOLS.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>

        <input
          id="input-deposit-amount"
          type="number"
          min="0"
          step="any"
          placeholder="Amount"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          className="input-field"
          disabled={loading}
          aria-label="Deposit amount"
          onKeyDown={(e) => e.key === "Enter" && handleDeposit()}
        />

        <button
          id="btn-deposit"
          className={`action-btn ${loading ? "" : "action-btn-accent"}`}
          onClick={handleDeposit}
          disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0}
          aria-busy={loading}
        >
          {loading ? "Depositing…" : "Deposit"}
        </button>
      </div>
    </div>
  );
}
