import { ASSET_SYMBOLS, ASSET_COLORS } from "../../config/contracts";
import { useToast } from "../shared/Toast";

// ─── Equal Weight Icon ────────────────────────────────────────────────────────
const BalanceIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/><path d="M5 6l7-3 7 3"/><path d="M5 12l7 3 7-3"/><path d="M5 18l7 3 7-3"/>
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AllocationSliders({
  allocationInputs,
  setAllocationInputs,
  setAllocations,
  onRebalanceClick,
  actionLoading,
  targetAllocations,
}) {
  const NUM_ASSETS = ASSET_SYMBOLS.length;
  const { toastSuccess, toastError, toastWarn, toastPending, updateToast } = useToast();

  const sliderSum = allocationInputs.reduce(
    (sum, val) => sum + (parseFloat(val || "0") || 0),
    0
  );
  const isAllocationValid = Math.abs(sliderSum - 100) < 0.01;

  const handleEqualWeight = () => {
    const equalVal = (100 / NUM_ASSETS).toFixed(2);
    const lastVal  = (100 - parseFloat(equalVal) * (NUM_ASSETS - 1)).toFixed(2);
    const copy = Array(NUM_ASSETS).fill(equalVal);
    copy[NUM_ASSETS - 1] = lastVal;
    setAllocationInputs(copy);
  };

  const handleSetAllocations = async () => {
    if (!isAllocationValid) {
      toastWarn("Allocation Invalid", {
        message: `Total is ${sliderSum.toFixed(2)}% — must equal exactly 100%.`,
      });
      return;
    }
    const bps = allocationInputs.map((v) => Math.round(parseFloat(v || "0") * 100));
    const pendingId = toastPending("Saving target allocations…", {
      message: "Awaiting MetaMask confirmation",
    });

    try {
      await setAllocations(bps);
      updateToast(pendingId, {
        type: "success",
        title: "Allocations Updated",
        message: "Target allocations saved to the contract.",
      });
    } catch (err) {
      const msg = err?.reason || err?.message || "";
      if (!msg.includes("user rejected") && !msg.includes("ACTION_REJECTED")) {
        updateToast(pendingId, {
          type: "error",
          title: "Failed to Save Allocations",
          message: err?.reason || "Transaction failed. Please try again.",
        });
      } else {
        updateToast(pendingId, { type: "warn", title: "Cancelled", message: "You rejected the transaction." });
      }
      console.error("Set allocation failed:", err);
    }
  };

  return (
    <div className="card slider-allocation-card">
      <div className="card-header-flex">
        <h3 className="card-title">Target Allocation (%)</h3>
        <button className="action-btn btn-sm" onClick={handleEqualWeight} disabled={actionLoading}>
          <BalanceIcon /> Equal Weight
        </button>
      </div>

      {/* 3-column slider grid */}
      <div className="allocation-sliders-grid-3col">
        {ASSET_SYMBOLS.map((sym, i) => (
          <div key={sym} className="slider-group">
            <div className="slider-label-row">
              <span className="slider-sym" style={{ color: ASSET_COLORS[i] }}>{sym}</span>
              <div className="slider-val-input">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={allocationInputs[i] || "0.00"}
                  onChange={(e) => {
                    const copy = [...allocationInputs];
                    copy[i] = e.target.value;
                    setAllocationInputs(copy);
                  }}
                  className="input-field input-tiny"
                  aria-label={`${sym} allocation percentage`}
                  disabled={actionLoading}
                />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={parseFloat(allocationInputs[i] || "0")}
              onChange={(e) => {
                const copy = [...allocationInputs];
                copy[i] = e.target.value;
                setAllocationInputs(copy);
              }}
              className="range-slider"
              style={{ accentColor: ASSET_COLORS[i] }}
              aria-label={`${sym} allocation slider`}
              disabled={actionLoading}
            />
          </div>
        ))}
      </div>

      {/* Total progress */}
      <div className="total-progress-container">
        <div className="progress-label-row">
          <span>Total Allocation</span>
          <strong className={isAllocationValid ? "text-success" : "text-danger"}>
            {sliderSum.toFixed(2)}% / 100%
          </strong>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${isAllocationValid ? "bg-success" : "bg-danger"}`}
            style={{ width: `${Math.min(sliderSum, 100)}%` }}
          />
        </div>
        {!isAllocationValid && (
          <div className="progress-warning">
            ⚠ {sliderSum < 100
              ? `${(100 - sliderSum).toFixed(2)}% remaining`
              : `Exceeds 100% by ${(sliderSum - 100).toFixed(2)}%`}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button
          id="btn-set-allocation"
          className="action-btn"
          onClick={handleSetAllocations}
          disabled={actionLoading || !isAllocationValid}
          aria-busy={actionLoading}
        >
          Save Allocation
        </button>
        <button
          id="btn-rebalance"
          className="action-btn action-btn-accent"
          onClick={onRebalanceClick}
          disabled={actionLoading}
          aria-busy={actionLoading}
        >
          ⚖ Rebalance Portfolio
        </button>
      </div>
    </div>
  );
}
