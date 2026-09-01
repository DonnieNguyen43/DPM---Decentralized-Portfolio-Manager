import { useState } from "react";
import { ethers } from "ethers";
import { usePortfolio } from "../hooks/usePortfolio";
import { TOKEN_ADDRESSES } from "../config/contracts";

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const SwapIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 106 5.63L3 8"/>
    <path d="M12 7v5l4 2"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortenAddress(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tokenLabel(address) {
  if (!address) return "";
  const entry = Object.entries(TOKEN_ADDRESSES).find(
    ([, addr]) => addr.toLowerCase() === address.toLowerCase()
  );
  return entry ? entry[0] : shortenAddress(address);
}

function formatTimestamp(ts) {
  return new Date(Number(ts) * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(val) {
  try {
    const num = parseFloat(ethers.formatEther(val));
    return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
  } catch {
    return val?.toString() || "0";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransactionLog() {
  const { account, swapEvents } = usePortfolio();
  const [expandedTx, setExpandedTx] = useState({});

  if (!account) return null;

  // Group events by txHash
  const groupedMap = {};
  swapEvents.forEach((evt) => {
    const hash = evt.txHash;
    if (!groupedMap[hash]) {
      groupedMap[hash] = { txHash: hash, timestamp: evt.timestamp, swaps: [] };
    }
    groupedMap[hash].swaps.push(evt);
  });

  const groupedList = Object.values(groupedMap);
  const toggleExpand = (hash) =>
    setExpandedTx((prev) => ({ ...prev, [hash]: !prev[hash] }));

  return (
    <div className="card">
      <div className="card-header-flex">
        <h3 className="card-title">Swap History</h3>
        <span className="badge badge-info">
          {groupedList.length} Rebalance Batch{groupedList.length !== 1 ? "es" : ""}
        </span>
      </div>

      {groupedList.length === 0 ? (
        <div className="empty-table" role="status">
          <span className="empty-table-icon" aria-hidden="true">
            <HistoryIcon />
          </span>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            No rebalance transactions yet
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
            Execute a Rebalance to see swap history here
          </p>
        </div>
      ) : (
        <div className="grouped-tx-container">
          {groupedList.map((txGroup) => {
            const isExpanded = !!expandedTx[txGroup.txHash];
            const swapCount  = txGroup.swaps.length;

            return (
              <div key={txGroup.txHash} className="grouped-tx-card">
                {/* Row Header */}
                <div
                  className="grouped-tx-header"
                  onClick={() => toggleExpand(txGroup.txHash)}
                  role="button"
                  aria-expanded={isExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleExpand(txGroup.txHash)}
                >
                  {/* Timestamp */}
                  <div className="tx-col-time">
                    <span className={`expand-icon ${isExpanded ? "open" : ""}`} aria-hidden="true">
                      <ChevronDownIcon />
                    </span>
                    <span className="tx-time">{formatTimestamp(txGroup.timestamp)}</span>
                  </div>

                  {/* Tx Hash Link */}
                  <a
                    href={`https://optimistic.etherscan.io/tx/${txGroup.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-hash-link"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`View transaction ${shortenAddress(txGroup.txHash)} on Etherscan`}
                  >
                    {shortenAddress(txGroup.txHash)} <ExternalLinkIcon />
                  </a>

                  {/* Success badge */}
                  <span className="badge badge-success">✓ Success</span>

                  {/* Swap count */}
                  <span className="tx-swap-count">{swapCount} swap{swapCount !== 1 ? "s" : ""}</span>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                  <div className="grouped-tx-body">
                    <table className="data-table child-swap-table" aria-label={`Swaps in transaction ${shortenAddress(txGroup.txHash)}`}>
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Sell Token</th>
                          <th className="text-right">Sell Amount</th>
                          <th>Buy Token</th>
                          <th className="text-right">Buy Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txGroup.swaps.map((sw, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="badge badge-swap-sm" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <SwapIcon /> SWAP
                              </span>
                            </td>
                            <td className="cell-token">{tokenLabel(sw.tokenIn)}</td>
                            <td className="text-right cell-amount">{formatAmount(sw.amountIn)}</td>
                            <td className="cell-token">{tokenLabel(sw.tokenOut)}</td>
                            <td className="text-right cell-amount">{formatAmount(sw.amountOut)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
