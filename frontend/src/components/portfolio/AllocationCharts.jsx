import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ASSET_SYMBOLS, ASSET_COLORS } from "../../config/contracts";

// Custom Tooltip
function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const colorIdx = ASSET_SYMBOLS.indexOf(item.name);
  const color = colorIdx !== -1 ? ASSET_COLORS[colorIdx] : "#fff";
  return (
    <div className="custom-pie-tooltip">
      <span className="tooltip-dot" style={{ background: color }} />
      <span className="tooltip-title">{item.name}</span>
      <span className="tooltip-val">{Number(item.value).toFixed(1)}%</span>
    </div>
  );
}

// Single Donut
function DonutChart({ data, title, assetMetrics, totalUsd, isTarget }) {
  const legendItems = [...assetMetrics].sort((a, b) => {
    const maxA = Math.max(a.targetPct, a.actualPct);
    const maxB = Math.max(b.targetPct, b.actualPct);
    if (Math.abs(maxA - maxB) > 0.001) return maxB - maxA;
    return ASSET_SYMBOLS.indexOf(a.name) - ASSET_SYMBOLS.indexOf(b.name);
  });

  if (data.length === 0) {
    return (
      <div className="pie-container empty-pie">
        <h4 className="pie-chart-subtitle">{title}</h4>
        <p className="no-data">No allocation data</p>
      </div>
    );
  }

  return (
    <div className="pie-container">
      {/* Header */}
      <div className="pie-header-row">
        <h4 className="pie-chart-subtitle">{title}</h4>
        <span className="pie-header-badge">
          {isTarget
            ? "100.0% Target"
            : `$${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </span>
      </div>

      {/* Legend */}
      <div className="custom-legend-grid-top">
        {legendItems.map((item) => {
          const val = isTarget ? item.targetPct : item.actualPct;
          const isZero = item.usdValue < 0.01 && item.targetPct < 0.05;
          return (
            <div key={item.name} className={`custom-legend-item ${isZero ? "legend-muted" : ""}`}>
              <div className="legend-left">
                <span
                  className="legend-dot"
                  style={{
                    background: isZero ? "rgba(255,255,255,0.15)" : item.color,
                    boxShadow: isZero ? "none" : `0 0 5px ${item.color}80`,
                  }}
                />
                <span
                  className="legend-name"
                  style={{ color: isZero ? "var(--text-secondary)" : item.color }}
                >
                  {item.name}
                </span>
              </div>
              <span className="legend-val">{val.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      {/* Donut + Center Overlay */}
      <div className="pie-responsive-wrapper">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            >
              {data.map((entry) => {
                const colorIdx = ASSET_SYMBOLS.indexOf(entry.name);
                const color = colorIdx !== -1 ? ASSET_COLORS[colorIdx] : "#8f96a3";
                return <Cell key={`cell-${entry.name}`} fill={color} />;
              })}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Overlay */}
        <div className="donut-center-overlay">
          <div className="donut-center-val">
            {isTarget ? "100%" : totalUsd > 0 ? `$${totalUsd.toFixed(0)}` : "$0"}
          </div>
          <div className="donut-center-sub">{isTarget ? "TARGET" : "PORTFOLIO"}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function AllocationCharts({ assetMetrics, totalUsd }) {
  const targetData = assetMetrics
    .filter((d) => d.targetPct > 0)
    .map((d) => ({ name: d.name, value: d.targetPct }));

  const actualData = assetMetrics
    .filter((d) => d.actualPct > 0)
    .map((d) => ({ name: d.name, value: d.actualPct }));

  return (
    <div className="card side-charts-card" style={{ height: "100%" }}>
      <h3 className="card-title">Allocation Distribution</h3>
      <div className="charts-row">
        <DonutChart
          data={targetData}
          title="Target Allocation"
          assetMetrics={assetMetrics}
          totalUsd={totalUsd}
          isTarget={true}
        />
        <DonutChart
          data={actualData}
          title="Actual Allocation"
          assetMetrics={assetMetrics}
          totalUsd={totalUsd}
          isTarget={false}
        />
      </div>
    </div>
  );
}
