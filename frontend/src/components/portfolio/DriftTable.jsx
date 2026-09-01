import { ASSET_DRIFT_TIERS } from "../../config/contracts";

/**
 * DriftTable — Allocation Drift & Risk Monitoring table.
 * Displays current vs target allocation with asset-tiered drift tolerance + multi-state risk badges.
 */
export default function DriftTable({ sortedAssetMetrics }) {
  return (
    <div className="card drift-card">
      <h3 className="card-title">Allocation Drift &amp; Risk Monitoring</h3>
      <div className="table-container">
        <table className="data-table drift-table" aria-label="Allocation drift and risk table">
          <thead>
            <tr>
              <th>Asset</th>
              <th className="text-right">Price</th>
              <th className="text-right">USD Balance</th>
              <th className="text-right">Target %</th>
              <th className="text-right">Actual %</th>
              <th className="text-right">Drift</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssetMetrics.map((am) => {
              const isZeroAsset = am.usdValue < 0.01 && am.targetPct < 0.05;
              const absDrift = Math.abs(am.driftPct);
              const isZeroDrift = absDrift < 0.005;

              // Tiered drift threshold configuration per token
              const tier = ASSET_DRIFT_TIERS[am.name] || { warn: 2.5, trigger: 5.0 };

              const isCriticalOver  = am.driftPct >= tier.trigger;
              const isCriticalUnder = am.driftPct <= -tier.trigger;
              const isWarnOver      = am.driftPct >= tier.warn && am.driftPct < tier.trigger;
              const isWarnUnder     = am.driftPct <= -tier.warn && am.driftPct > -tier.trigger;
              const isBalanced      = !isCriticalOver && !isCriticalUnder && !isWarnOver && !isWarnUnder;

              // Drift badge class
              let driftClass = "drift-zero";
              let prefix = "";
              if (!isZeroAsset && !isZeroDrift) {
                if (am.driftPct > 0) { driftClass = "drift-pos"; prefix = "+"; }
                else                  { driftClass = "drift-neg"; }
              }

              // Formatted drift string
              let driftStr = "—";
              if (!isZeroAsset && !isZeroDrift) {
                const numStr = absDrift < 1.0 ? absDrift.toFixed(2) : absDrift.toFixed(1);
                driftStr = `${prefix}${am.driftPct > 0 ? numStr : "-" + numStr}%`;
              }

              // Inline drift progress bar (relative to tier.trigger)
              const maxLimit = tier.trigger * 2;
              const barPct = Math.min((absDrift / maxLimit) * 100, 100);
              const barColor = isZeroAsset
                ? "rgba(255,255,255,0.1)"
                : (isCriticalOver || isCriticalUnder)
                  ? "var(--color-loss)"
                  : (isWarnOver || isWarnUnder)
                    ? "var(--color-warn)"
                    : "var(--color-gain)";

              return (
                <tr key={am.name} className={isZeroAsset ? "row-zero-balance" : ""}>
                  {/* Asset */}
                  <td>
                    <div className="asset-cell">
                      <span
                        className="asset-dot"
                        style={{ background: isZeroAsset ? "rgba(255,255,255,0.15)" : am.color }}
                      />
                      <strong style={{ opacity: isZeroAsset ? 0.45 : 1, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        {am.name}
                      </strong>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="text-right" style={{ opacity: isZeroAsset ? 0.45 : 1 }}>
                    <span className="cell-amount">
                      {am.name === "USDT"
                        ? "$1.00"
                        : `$${am.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                    </span>
                  </td>

                  {/* USD Balance */}
                  <td className="text-right" style={{ opacity: isZeroAsset ? 0.45 : 1 }}>
                    <span className="cell-amount">
                      ${am.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Target % */}
                  <td className="text-right" style={{ opacity: isZeroAsset ? 0.45 : 1 }}>
                    <span className="cell-amount">{am.targetPct.toFixed(1)}%</span>
                  </td>

                  {/* Actual % */}
                  <td className="text-right" style={{ opacity: isZeroAsset ? 0.45 : 1 }}>
                    <span className="cell-amount">{am.actualPct.toFixed(1)}%</span>
                  </td>

                  {/* Drift Badge + Mini Bar */}
                  <td className="text-right drift-bar-cell">
                    <span className={`drift-badge ${driftClass}`}>{driftStr}</span>
                    <div className="drift-bar-track">
                      <div
                        className="drift-bar-fill"
                        style={{ width: `${barPct}%`, background: barColor }}
                      />
                    </div>
                  </td>

                  {/* Multi-state Status Badge */}
                  <td>
                    {isZeroAsset && <span className="badge badge-balanced" style={{ opacity: 0.5 }}>BALANCED</span>}
                    {!isZeroAsset && isCriticalOver && <span className="badge badge-critical-over">CRITICAL OVER</span>}
                    {!isZeroAsset && isCriticalUnder && <span className="badge badge-critical-under">CRITICAL UNDER</span>}
                    {!isZeroAsset && isWarnOver && <span className="badge badge-over">OVERWEIGHT</span>}
                    {!isZeroAsset && isWarnUnder && <span className="badge badge-under">UNDERWEIGHT</span>}
                    {!isZeroAsset && isBalanced && <span className="badge badge-balanced">BALANCED</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
