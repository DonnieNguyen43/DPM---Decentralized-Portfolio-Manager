import { ethers } from "ethers";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ASSET_SYMBOLS, ASSET_COLORS } from "../../config/contracts";

// ─── PnL Arrow Icons ──────────────────────────────────────────────────────────
const ArrowUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 14l5-5 5 5H7z"/>
  </svg>
);
const ArrowDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 10l5 5 5-5H7z"/>
  </svg>
);
const MinusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="11" width="16" height="2" rx="1"/>
  </svg>
);

// ─── Custom Sparkline Tooltip ─────────────────────────────────────────────────
function SparkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,16,30,0.96)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "6px 10px",
      fontSize: 12,
      fontFamily: "var(--font-mono)",
      color: "#fff",
    }}>
      ${Number(payload[0].value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfolioSummary({
  portfolioValue,
  totalDepositedUsd,
  totalPnlUsd,
  totalPnlPct,
  pnl24hUsd,
  pnl24hPct,
  portfolioHistory,
  prices,
  totalAbsDrift,
  loading,
  selectedChartSymbol,
  onSelectSymbol,
}) {
  const totalUsd = Number(ethers.formatEther(portfolioValue.total));

  const getPnlClass = (val, hasData) => {
    if (!hasData || totalUsd === 0) return "pnl-neutral";
    if (val > 0) return "pnl-up";
    if (val < 0) return "pnl-down";
    return "pnl-neutral";
  };

  const sparkColor = pnl24hUsd < 0 ? "var(--color-loss)" : "var(--color-gain)";

  // Build sparkline data
  let sparklineData = [];
  if (totalUsd > 0) {
    sparklineData = [...portfolioHistory];
    const val24hStart = totalUsd - pnl24hUsd;
    if (sparklineData.length < 2) {
      sparklineData = [
        { time: "24h Ago", value: val24hStart },
        { time: "Now", value: totalUsd },
      ];
    } else if (sparklineData.length < 10) {
      sparklineData = [{ time: "24h Ago", value: val24hStart }, ...sparklineData];
    }
  }

  // Build sorted asset grid
  const sortedAssetGrid = ASSET_SYMBOLS.map((sym, i) => {
    const usdVal = Number(ethers.formatEther(portfolioValue.assets[i] || 0n));
    const isUsdt = sym === "USDT";
    const priceVal = isUsdt ? 1.0 : Number(prices[i] || 0n) / 1e8;
    return { sym, index: i, color: ASSET_COLORS[i], usdVal, priceVal, isUsdt, isHeld: usdVal >= 0.01 };
  }).sort((a, b) => {
    if (a.isHeld !== b.isHeld) return a.isHeld ? -1 : 1;
    if (a.isHeld && b.isHeld) return b.usdVal - a.usdVal;
    return a.index - b.index;
  });

  return (
    <>
      {/* Header: Total + PnL badges */}
      <div className="portfolio-header-flex">
        <div>
          <h2 className="card-title">Total Portfolio Value</h2>
          <div className="portfolio-total" id="portfolio-total">
            ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {totalDepositedUsd > 0 && (
            <div className="portfolio-deposited">
              Deposited: ${totalDepositedUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <div className="pnl-metrics">
          {/* 24h PnL */}
          <div className={`pnl-badge ${getPnlClass(pnl24hUsd, totalUsd > 0)}`}>
            <span className="pnl-label">24h PnL</span>
            <span className="pnl-value">
              <span className="pnl-icon">
                {pnl24hUsd > 0 ? <ArrowUpIcon /> : pnl24hUsd < 0 ? <ArrowDownIcon /> : <MinusIcon />}
              </span>
              {totalUsd > 0
                ? `${pnl24hUsd >= 0 ? "+" : ""}$${Math.abs(pnl24hUsd).toFixed(2)} (${pnl24hPct >= 0 ? "+" : ""}${pnl24hPct.toFixed(2)}%)`
                : "$0.00 (0.00%)"}
            </span>
          </div>

          {/* Total PnL */}
          <div className={`pnl-badge ${getPnlClass(totalPnlUsd, totalDepositedUsd > 0 && totalUsd > 0)}`}>
            <span className="pnl-label">Total PnL</span>
            <span className="pnl-value">
              <span className="pnl-icon">
                {totalPnlUsd > 0 ? <ArrowUpIcon /> : totalPnlUsd < 0 ? <ArrowDownIcon /> : <MinusIcon />}
              </span>
              {totalDepositedUsd > 0 && totalUsd > 0
                ? `${totalPnlUsd >= 0 ? "+" : ""}$${Math.abs(totalPnlUsd).toFixed(2)} (${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%)`
                : "$0.00 (0.00%)"}
            </span>
          </div>

          {/* Drift */}
          <div className="pnl-badge pnl-drift">
            <span className="pnl-label">Portfolio Drift</span>
            <span className="pnl-value">{totalAbsDrift.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Sparkline Area Chart */}
      {sparklineData.length > 1 && (
        <div className="portfolio-sparkline-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={sparkColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<SparkTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparkColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#sparkGradient)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Asset Grid */}
      <div className="asset-grid">
        {sortedAssetGrid.map((item) => {
          const isSelected = selectedChartSymbol === item.sym;
          return (
            <div
              key={item.sym}
              className={`asset-item ${item.isHeld ? "asset-held" : "asset-unheld"} ${isSelected ? "selected-asset" : ""}`}
              onClick={() => !item.isUsdt && onSelectSymbol(item.sym)}
              title={item.isUsdt ? item.sym : `Click to view ${item.sym} chart`}
              style={{
                cursor: item.isUsdt ? "default" : "pointer",
                borderColor: item.isHeld ? `${item.color}55` : "rgba(255,255,255,0.06)",
                background: item.isHeld
                  ? `linear-gradient(135deg, ${item.color}12 0%, rgba(255,255,255,0.02) 100%)`
                  : "rgba(255,255,255,0.012)",
              }}
            >
              <span
                className="asset-dot"
                style={{
                  background: item.isHeld ? item.color : "rgba(255,255,255,0.18)",
                  boxShadow: item.isHeld ? `0 0 7px ${item.color}90` : "none",
                }}
              />
              <div className="asset-info">
                <span
                  className="asset-name"
                  style={{ color: item.isHeld ? item.color : "var(--text-muted)" }}
                >
                  {item.sym}
                </span>
                <span className="asset-price">
                  @{item.isUsdt ? "$1.00" : `$${item.priceVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <span
                className="asset-value"
                style={{ color: item.isHeld ? "#ffffff" : "var(--text-muted)" }}
              >
                ${item.usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>

      {loading && <div className="loading-bar" />}
    </>
  );
}
