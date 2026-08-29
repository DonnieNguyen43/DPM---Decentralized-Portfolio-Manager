import { useState } from "react";
import { ethers } from "ethers";
import { usePortfolio } from "../hooks/usePortfolio";
import { TOKEN_ADDRESSES } from "../config/contracts";

function shortenAddress(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tokenLabel(address) {
  if (!address) return "";
  const entry = Object.entries(TOKEN_ADDRESSES).find(
    ([_, addr]) => addr.toLowerCase() === address.toLowerCase()
  );
  return entry ? entry[0] : shortenAddress(address);
}

function formatTimestamp(ts) {
  return new Date(Number(ts) * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatAmount(val) {
  try {
    const formatted = ethers.formatEther(val);
    const num = parseFloat(formatted);
    return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
  } catch {
    return val?.toString() || "0";
  }
}

export default function TransactionLog() {
  const { account, swapEvents } = usePortfolio();
  const [expandedTx, setExpandedTx] = useState({});

  if (!account) return null;

  // Group events by txHash
  const groupedMap = {};
  swapEvents.forEach((evt) => {
    const hash = evt.txHash;
    if (!groupedMap[hash]) {
      groupedMap[hash] = {
        txHash: hash,
        timestamp: evt.timestamp,
        swaps: [],
      };
    }
    groupedMap[hash].swaps.push(evt);
  });

  const groupedList = Object.values(groupedMap);

  const toggleExpand = (hash) => {
    setExpandedTx((prev) => ({ ...prev, [hash]: !prev[hash] }));
  };

  return (
    <div className="card">
      <div className="card-header-flex">
        <h3 className="card-title">Swap History (Grouped by Rebalance TX)</h3>
        <span className="badge badge-info">{groupedList.length} Rebalance Batch(es)</span>
      </div>

      {groupedList.length === 0 ? (
        <div className="empty-table">
          <span>No rebalance transactions found</span>
        </div>
      ) : (
        <div className="grouped-tx-container">
          {groupedList.map((txGroup) => {
            const isExpanded = !!expandedTx[txGroup.txHash];
            const swapCount = txGroup.swaps.length;

            return (
              <div key={txGroup.txHash} className="grouped-tx-card">
                <div
                  className="grouped-tx-header"
                  onClick={() => toggleExpand(txGroup.txHash)}
                >
                  <div className="tx-col tx-col-time">
                    <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                    <span className="tx-time">{formatTimestamp(txGroup.timestamp)}</span>
                  </div>

                  <div className="tx-col tx-col-hash">
                    <a
                      href={`https://optimistic.etherscan.io/tx/${txGroup.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-hash-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {shortenAddress(txGroup.txHash)}
                    </a>
                  </div>

                  <div className="tx-col tx-col-spacer"></div>

                  <div className="tx-col tx-col-status">
                    <span className="badge badge-success">Success</span>
                  </div>

                  <div className="tx-col tx-col-count">
                    <span className="tx-swap-count">{swapCount} Swap(s)</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="grouped-tx-body">
                    <table className="data-table child-swap-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Sell Token</th>
                          <th>Sell Amount</th>
                          <th>Buy Token</th>
                          <th>Buy Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txGroup.swaps.map((sw, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="badge badge-swap-sm">SWAP</span>
                            </td>
                            <td className="cell-token">
                              <strong>{tokenLabel(sw.tokenIn)}</strong>
                            </td>
                            <td className="cell-amount">{formatAmount(sw.amountIn)}</td>
                            <td className="cell-token">
                              <strong>{tokenLabel(sw.tokenOut)}</strong>
                            </td>
                            <td className="cell-amount">{formatAmount(sw.amountOut)}</td>
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
