import React from "react";
import { ethers } from "ethers";
import { ASSET_SYMBOLS, ASSET_COLORS } from "../config/contracts";

function shortenAddress(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function RebalanceReviewModal({
  isOpen,
  onClose,
  onConfirm,
  balances,
  targetAllocations,
  prices,
  totalUsd,
  actionLoading,
}) {
  if (!isOpen) return null;

  // Calculate Asset USD values & Target USD values
  const NUM_ASSETS = ASSET_SYMBOLS.length;
  const assetValuesUsd = [];
  let currentTotalUsd = 0;

  for (let i = 0; i < NUM_ASSETS; i++) {
    const priceNum = Number(prices[i] || 0n) / 1e8;
    const balNum = Number(ethers.formatEther(balances[i] || 0n));
    const valUsd = balNum * priceNum;
    assetValuesUsd.push(valUsd);
    currentTotalUsd += valUsd;
  }

  // Simulate Rebalancing Swaps matching PortfolioManager.sol logic
  const simulatedSwaps = [];
  const afterAssetValues = [...assetValuesUsd];

  if (currentTotalUsd > 0) {
    for (let i = 0; i < NUM_ASSETS; i++) {
      const targetUsd = (currentTotalUsd * Number(targetAllocations[i] || 0n)) / 10000;
      if (afterAssetValues[i] > targetUsd) {
        const excessUsd = afterAssetValues[i] - targetUsd;
        if (excessUsd < 0.01) continue;

        // Find largest deficit
        let maxDeficit = 0;
        let bestDeficitIndex = i;
        for (let j = 0; j < NUM_ASSETS; j++) {
          if (j === i) continue;
          const targetJUsd = (currentTotalUsd * Number(targetAllocations[j] || 0n)) / 10000;
          if (targetJUsd > afterAssetValues[j]) {
            const def = targetJUsd - afterAssetValues[j];
            if (def > maxDeficit) {
              maxDeficit = def;
              bestDeficitIndex = j;
            }
          }
        }

        if (bestDeficitIndex !== i && maxDeficit > 0) {
          const sellPrice = Number(prices[i] || 0n) / 1e8;
          const buyPrice = Number(prices[bestDeficitIndex] || 0n) / 1e8;

          const sellAmount = sellPrice > 0 ? excessUsd / sellPrice : 0;
          const buyAmount = buyPrice > 0 ? excessUsd / buyPrice : 0;

          simulatedSwaps.push({
            tokenIn: ASSET_SYMBOLS[i],
            amountIn: sellAmount,
            tokenOut: ASSET_SYMBOLS[bestDeficitIndex],
            amountOut: buyAmount,
            usdValue: excessUsd,
            priceImpact: "< 0.1%",
          });

          afterAssetValues[i] -= excessUsd;
          afterAssetValues[bestDeficitIndex] += excessUsd;
        }
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚖️ Review Rebalancing Plan</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-subtitle">
            DPM system calculated the following execution route to realign your portfolio with target allocations:
          </p>

          <h4 className="section-subtitle">Simulated Swap Transactions</h4>
          {simulatedSwaps.length === 0 ? (
            <div className="empty-sim-swaps">
              <span>Portfolio is already perfectly balanced within target thresholds.</span>
            </div>
          ) : (
            <div className="sim-swaps-table-container">
              <table className="data-table sim-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Sell Token</th>
                    <th>Amount Out</th>
                    <th>Buy Token</th>
                    <th>Est. Received</th>
                    <th>USD Value</th>
                  </tr>
                </thead>
                <tbody>
                  {simulatedSwaps.map((sw, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="badge badge-swap">SWAP</span>
                      </td>
                      <td>
                        <strong>{sw.tokenIn}</strong>
                      </td>
                      <td>{sw.amountIn.toFixed(4)}</td>
                      <td>
                        <strong>{sw.tokenOut}</strong>
                      </td>
                      <td>{sw.amountOut.toFixed(4)}</td>
                      <td>${sw.usdValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4 className="section-subtitle" style={{ marginTop: "16px" }}>
            Allocation Preview (Before vs After)
          </h4>
          <div className="before-after-grid">
            {ASSET_SYMBOLS.map((sym, i) => {
              const beforePct = currentTotalUsd > 0 ? (assetValuesUsd[i] / currentTotalUsd) * 100 : 0;
              const afterPct = currentTotalUsd > 0 ? (afterAssetValues[i] / currentTotalUsd) * 100 : 0;
              const targetPct = Number(targetAllocations[i] || 0n) / 100;

              return (
                <div key={sym} className="before-after-item">
                  <div className="ba-header">
                    <span className="asset-dot" style={{ background: ASSET_COLORS[i] }}></span>
                    <span className="ba-symbol">{sym}</span>
                    <span className="ba-target">Target: {targetPct}%</span>
                  </div>
                  <div className="ba-bar-container">
                    <div className="ba-row">
                      <span>Current:</span>
                      <strong>{beforePct.toFixed(1)}%</strong>
                    </div>
                    <div className="ba-row">
                      <span>After:</span>
                      <strong style={{ color: "#10b981" }}>{afterPct.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-fee-notice">
            <span>Estimated Gas Fee: ~0.0004 ETH | Slippage Tolerance: 1.0%</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="action-btn" onClick={onClose} disabled={actionLoading}>
            Cancel
          </button>
          <button
            className="action-btn action-btn-accent"
            onClick={onConfirm}
            disabled={actionLoading || simulatedSwaps.length === 0}
          >
            {actionLoading ? "Executing on-chain..." : "Confirm & Execute Rebalance"}
          </button>
        </div>
      </div>
    </div>
  );
}
