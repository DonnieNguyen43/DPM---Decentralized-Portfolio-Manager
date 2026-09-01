import { ethers } from "ethers";
import { ASSET_SYMBOLS, ASSET_COLORS } from "../config/contracts";
import { useToast } from "./shared/Toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ExternalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const GasIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h5l2 4-3 1.5a11 11 0 005 5L13.5 11l4 2V3h-3"/><path d="M17 3v4h4"/>
  </svg>
);

const CheckCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const SpinnerIcon = () => (
  <div style={{
    width: 14, height: 14,
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  }} />
);

// ─── Step Indicator ────────────────────────────────────────────────────────────
const STEPS = ["Review Plan", "Confirm", "Executing", "Done"];

function StepIndicator({ currentStep }) {
  return (
    <div className="step-indicator" role="progressbar" aria-valuenow={currentStep} aria-valuemax={STEPS.length}>
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isDone   = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: idx < STEPS.length - 1 ? "1 1 0" : "0 0 auto" }}>
            <div className={`step-item ${isDone ? "done" : isActive ? "active" : ""}`}>
              <div className="step-dot">
                {isDone ? <CheckCircle /> : isActive && currentStep === 3 ? <SpinnerIcon /> : stepNum}
              </div>
              <span className="step-label">{label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`step-connector ${isDone ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
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

  const currentStep = actionLoading ? 3 : 1;

  // Compute asset USD values
  const NUM_ASSETS = ASSET_SYMBOLS.length;
  const assetValuesUsd = [];
  let currentTotalUsd = 0;

  for (let i = 0; i < NUM_ASSETS; i++) {
    const priceNum = Number(prices[i] || 0n) / 1e8;
    const balNum   = Number(ethers.formatEther(balances[i] || 0n));
    const valUsd   = balNum * priceNum;
    assetValuesUsd.push(valUsd);
    currentTotalUsd += valUsd;
  }

  // Simulate rebalancing swaps
  const simulatedSwaps = [];
  const afterAssetValues = [...assetValuesUsd];

  if (currentTotalUsd > 0) {
    for (let i = 0; i < NUM_ASSETS; i++) {
      const targetUsd = (currentTotalUsd * Number(targetAllocations[i] || 0n)) / 10000;

      while (afterAssetValues[i] > targetUsd + 0.01) {
        const excessUsd = afterAssetValues[i] - targetUsd;

        let maxDeficit = 0;
        let bestIdx = i;
        for (let j = 0; j < NUM_ASSETS; j++) {
          if (j === i) continue;
          const targetJUsd = (currentTotalUsd * Number(targetAllocations[j] || 0n)) / 10000;
          if (targetJUsd > afterAssetValues[j] + 0.01) {
            const def = targetJUsd - afterAssetValues[j];
            if (def > maxDeficit) { maxDeficit = def; bestIdx = j; }
          }
        }

        if (bestIdx === i || maxDeficit <= 0) break;

        const swapUsd    = Math.min(excessUsd, maxDeficit);
        if (swapUsd < 0.01) break;

        const sellPrice  = Number(prices[i] || 0n) / 1e8;
        const buyPrice   = Number(prices[bestIdx] || 0n) / 1e8;
        const sellAmount = sellPrice > 0 ? swapUsd / sellPrice : 0;
        const buyAmount  = buyPrice  > 0 ? swapUsd / buyPrice  : 0;

        if (sellAmount <= 0) break;

        simulatedSwaps.push({
          tokenIn:   ASSET_SYMBOLS[i],
          amountIn:  sellAmount,
          tokenOut:  ASSET_SYMBOLS[bestIdx],
          amountOut: buyAmount,
          usdValue:  swapUsd,
          colorIn:   ASSET_COLORS[i],
          colorOut:  ASSET_COLORS[bestIdx],
        });

        afterAssetValues[i]    -= swapUsd;
        afterAssetValues[bestIdx] += swapUsd;
      }
    }
  }

  const totalSwapUsd = simulatedSwaps.reduce((s, sw) => s + sw.usdValue, 0);

  return (
    <div className="modal-overlay" onClick={!actionLoading ? onClose : undefined} role="dialog" aria-modal="true" aria-label="Rebalance Review">
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h3>⚖ Review Rebalancing Plan</h3>
          <button className="modal-close-btn" onClick={onClose} disabled={actionLoading} aria-label="Close modal">✕</button>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        <div className="modal-body">
          <p className="modal-subtitle">
            DPM calculated the following swap route to realign your portfolio with your target allocations. Review carefully before confirming on-chain.
          </p>

          {/* Simulated Swaps Table */}
          <div className="section-subtitle">Simulated Swap Transactions ({simulatedSwaps.length})</div>

          {simulatedSwaps.length === 0 ? (
            <div className="empty-sim-swaps">
              <CheckCircle /> Portfolio is already balanced within target thresholds
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table className="data-table sim-table" aria-label="Simulated swap transactions">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Sell</th>
                    <th className="text-right">Amount</th>
                    <th>Buy</th>
                    <th className="text-right">Est. Received</th>
                    <th className="text-right">USD Value</th>
                  </tr>
                </thead>
                <tbody>
                  {simulatedSwaps.map((sw, idx) => (
                    <tr key={idx}>
                      <td><span className="badge badge-swap">SWAP</span></td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: sw.colorIn }}>
                          {sw.tokenIn}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="cell-amount">{sw.amountIn.toFixed(4)}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: sw.colorOut }}>
                          {sw.tokenOut}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="cell-amount">{sw.amountOut.toFixed(4)}</span>
                      </td>
                      <td className="text-right">
                        <span className="cell-amount">${sw.usdValue.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Before / After Allocation Preview */}
          <div className="section-subtitle" style={{ marginTop: 16 }}>Allocation Preview — Before vs After</div>
          <div className="before-after-grid">
            {ASSET_SYMBOLS.map((sym, i) => {
              const beforePct = currentTotalUsd > 0 ? (assetValuesUsd[i] / currentTotalUsd) * 100 : 0;
              const afterPct  = currentTotalUsd > 0 ? (afterAssetValues[i] / currentTotalUsd) * 100 : 0;
              const targetPct = Number(targetAllocations[i] || 0n) / 100;
              const isIdle    = beforePct < 0.1 && afterPct < 0.1;

              return (
                <div key={sym} className="before-after-item" style={{ opacity: isIdle ? 0.40 : 1 }}>
                  <div className="ba-header">
                    <span className="asset-dot" style={{ background: ASSET_COLORS[i] }} />
                    <span className="ba-symbol">{sym}</span>
                    <span className="ba-target">→ {targetPct.toFixed(1)}%</span>
                  </div>

                  {/* Before bar */}
                  <div className="ba-bar-track">
                    <div className="ba-bar-before" style={{ width: `${Math.min(beforePct, 100)}%` }} />
                  </div>
                  {/* After bar */}
                  <div className="ba-bar-track">
                    <div className="ba-bar-after" style={{ width: `${Math.min(afterPct, 100)}%` }} />
                  </div>

                  <div className="ba-bar-container">
                    <div className="ba-row">
                      <span>Before:</span>
                      <strong>{beforePct.toFixed(1)}%</strong>
                    </div>
                    <div className="ba-row">
                      <span>After:</span>
                      <strong className="after-val">{afterPct.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fee Notice */}
          {simulatedSwaps.length > 0 && (
            <div className="modal-fee-notice">
              <GasIcon />
              <span>
                Est. Gas: ~0.0004 ETH &nbsp;·&nbsp; Slippage: 1.0% &nbsp;·&nbsp;
                Total Swap Volume: ${totalSwapUsd.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="action-btn"
            onClick={onClose}
            disabled={actionLoading}
          >
            Cancel
          </button>
          <button
            className="action-btn action-btn-accent"
            onClick={onConfirm}
            disabled={actionLoading || simulatedSwaps.length === 0}
            aria-busy={actionLoading}
          >
            {actionLoading ? (
              <><SpinnerIcon />&nbsp;Executing on-chain…</>
            ) : (
              "Confirm & Execute Rebalance"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
