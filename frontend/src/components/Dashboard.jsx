import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import { usePortfolio } from "../hooks/usePortfolio";
import { ASSET_SYMBOLS, ASSET_COLORS } from "../config/contracts";
import PriceChart from "./PriceChart";
import RebalanceReviewModal from "./RebalanceReviewModal";
import TransactionLog from "./TransactionLog";

export default function Dashboard() {
  const {
    account,
    balances,
    targetAllocations,
    portfolioValue,
    prices,
    portfolioHistory,
    totalDepositedUsd,
    totalPnlUsd,
    totalPnlPct,
    pnl24hUsd,
    pnl24hPct,
    loading,
    deposit,
    setAllocations,
    rebalance,
  } = usePortfolio();

  const NUM_ASSETS = ASSET_SYMBOLS.length;

  const [depositAsset, setDepositAsset] = useState("WBTC");
  const [depositAmount, setDepositAmount] = useState("");
  const [allocationInputs, setAllocationInputs] = useState(Array(NUM_ASSETS).fill("0.00"));
  const [hasInitializedSliders, setHasInitializedSliders] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedChartSymbol, setSelectedChartSymbol] = useState("WBTC");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Sync target allocation sliders ONCE on initial load
  useEffect(() => {
    if (hasInitializedSliders || !targetAllocations || targetAllocations.length === 0) return;

    const hasContractTargets = targetAllocations.some((a) => Number(a) > 0);

    if (hasContractTargets) {
      const synced = targetAllocations.map((a) => (Number(a) / 100).toFixed(2));
      setAllocationInputs(synced);
      setHasInitializedSliders(true);
    } else if (portfolioValue && portfolioValue.total > 0n) {
      const totalUsd = Number(ethers.formatEther(portfolioValue.total));
      const synced = ASSET_SYMBOLS.map((_, i) => {
        const assetUsd = Number(ethers.formatEther(portfolioValue.assets[i] || 0n));
        return ((assetUsd / totalUsd) * 100).toFixed(2);
      });
      setAllocationInputs(synced);
      setHasInitializedSliders(true);
    } else {
      const equalVal = (100 / NUM_ASSETS).toFixed(2);
      const lastVal = (100 - parseFloat(equalVal) * (NUM_ASSETS - 1)).toFixed(2);
      const copy = Array(NUM_ASSETS).fill(equalVal);
      copy[NUM_ASSETS - 1] = lastVal;
      setAllocationInputs(copy);
      setHasInitializedSliders(true);
    }
  }, [targetAllocations, portfolioValue, hasInitializedSliders]);

  if (!account) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">📊</div>
        <p>Connect your wallet to view portfolio</p>
      </div>
    );
  }

  const totalUsd = Number(ethers.formatEther(portfolioValue.total));

  // Compute Target %, Actual %, and Drift %
  let totalAbsDrift = 0;

  const assetMetrics = ASSET_SYMBOLS.map((sym, i) => {
    const assetUsd = Number(ethers.formatEther(portfolioValue.assets[i] || 0n));
    const priceNum = Number(prices[i] || 0n) / 1e8;
    const actualPct = totalUsd > 0 ? (assetUsd / totalUsd) * 100 : 0;
    const targetPct = Number(targetAllocations[i] || 0n) / 100;
    const driftPct = actualPct - targetPct;
    totalAbsDrift += Math.abs(driftPct);

    return {
      name: sym,
      price: priceNum,
      usdValue: assetUsd,
      actualPct,
      targetPct,
      driftPct,
      color: ASSET_COLORS[i],
    };
  });

  // Sort asset metrics: Active holdings first (descending USD / %), 0% holdings last
  const sortedAssetMetrics = [...assetMetrics].sort((a, b) => {
    const valA = a.usdValue > 0 ? a.usdValue : Math.max(a.targetPct, a.actualPct);
    const valB = b.usdValue > 0 ? b.usdValue : Math.max(b.targetPct, b.actualPct);
    return valB - valA;
  });

  const targetData = assetMetrics
    .filter((d) => d.targetPct > 0)
    .map((d) => ({ name: d.name, value: d.targetPct }));

  const actualData = assetMetrics
    .filter((d) => d.actualPct > 0)
    .map((d) => ({ name: d.name, value: d.actualPct }));

  // Allocation Slider Total & Validation
  const sliderSum = allocationInputs.reduce((sum, val) => sum + (parseFloat(val || "0") || 0), 0);
  const isAllocationValid = Math.abs(sliderSum - 100) < 0.01;

  const handleEqualWeight = () => {
    const equalVal = (100 / NUM_ASSETS).toFixed(2);
    const lastVal = (100 - parseFloat(equalVal) * (NUM_ASSETS - 1)).toFixed(2);
    const copy = Array(NUM_ASSETS).fill(equalVal);
    copy[NUM_ASSETS - 1] = lastVal;
    setAllocationInputs(copy);
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setActionLoading(true);
    try {
      const amount = ethers.parseUnits(depositAmount, 18);
      await deposit(depositAsset, amount);
      setDepositAmount("");
      alert(`Đã nạp ${depositAmount} ${depositAsset} thành công!`);
    } catch (err) {
      console.error("Deposit failed:", err);
      const msg = err?.reason || err?.message || "";
      if (!msg.includes("user rejected") && !msg.includes("ACTION_REJECTED")) {
        alert("Nạp tiền thất bại: " + (err.reason || "Giao dịch bị hủy hoặc lỗi mạng."));
      }
    }
    setActionLoading(false);
  };

  const handleSetAllocations = async () => {
    if (!isAllocationValid) {
      alert("Tổng tỷ lệ phân bổ phải đúng bằng 100%");
      return;
    }
    const bps = allocationInputs.map((v) => Math.round(parseFloat(v || "0") * 100));
    setActionLoading(true);
    try {
      await setAllocations(bps);
      setHasInitializedSliders(false); // Re-sync once with updated contract state
      alert("Đã cập nhật tỷ lệ phân bổ mục tiêu thành công!");
    } catch (err) {
      console.error("Set allocation failed:", err);
      const msg = err?.reason || err?.message || "";
      if (!msg.includes("user rejected") && !msg.includes("ACTION_REJECTED")) {
        alert("Thiết lập tỷ lệ thất bại: " + (err.reason || err.message || "Lỗi giao dịch."));
      }
    }
    setActionLoading(false);
  };

  const handleRebalanceClick = () => {
    if (totalUsd === 0) {
      alert("Không thể Rebalance: Danh mục của bạn đang trống ($0). Vui lòng Nạp tiền (Deposit) trước.");
      return;
    }
    setIsReviewModalOpen(true);
  };

  const handleConfirmRebalance = async () => {
    setActionLoading(true);
    try {
      await rebalance();
      setIsReviewModalOpen(false);
      setHasInitializedSliders(false); // Re-sync once with updated contract state
      alert("Đã thực hiện tái cân bằng danh mục (Rebalance) thành công!");
    } catch (err) {
      console.error("Rebalance failed:", err);
      const reason = err?.reason || err?.message || "";
      if (!reason.includes("user rejected") && !reason.includes("ACTION_REJECTED")) {
        alert("Rebalance thất bại: " + (err.reason || "Lỗi giao dịch hoán đổi."));
      }
    }
    setActionLoading(false);
  };

  const renderPieChart = (data, title) => {
    if (data.length === 0) {
      return (
        <div className="pie-container empty-pie">
          <h4 className="pie-chart-subtitle">{title}</h4>
          <p className="no-data">No allocation data</p>
        </div>
      );
    }

    const isTarget = title.includes("Target");

    // Sort legend items: Active assets first (descending %), 0% assets pushed to the end
    const legendItems = [...assetMetrics].sort((a, b) => {
      const valA = isTarget ? a.targetPct : a.actualPct;
      const valB = isTarget ? b.targetPct : b.actualPct;
      return valB - valA;
    });

    return (
      <div className="pie-container">
        <h4 className="pie-chart-subtitle">{title}</h4>
        <div className="pie-responsive-wrapper">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry) => {
                  const colorIdx = ASSET_SYMBOLS.indexOf(entry.name);
                  const color = colorIdx !== -1 ? ASSET_COLORS[colorIdx] : "#8f96a3";
                  return <Cell key={`cell-${entry.name}`} fill={color} />;
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#16172b",
                  borderColor: "#ffffff1a",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(val) => `${typeof val === "number" ? val.toFixed(2) : val}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Grid: Active assets first with glowing dots, 0% assets with muted dots */}
        <div className="custom-legend-grid-9">
          {legendItems.map((item) => {
            const val = isTarget ? item.targetPct : item.actualPct;
            const isZero = item.usdValue < 0.01 && item.targetPct < 0.05;
            return (
              <div
                key={item.name}
                className={`custom-legend-item ${isZero ? "legend-muted" : ""}`}
              >
                <span
                  className="legend-dot"
                  style={{
                    background: isZero ? "rgba(255, 255, 255, 0.15)" : item.color,
                    boxShadow: isZero ? "none" : `0 0 6px ${item.color}80`,
                  }}
                ></span>
                <span className="legend-name">{item.name}</span>
                <span className="legend-val">{val.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const is24hPos = pnl24hUsd >= 0;
  const sparkColor = is24hPos ? "#10b981" : "#ef4444";

  // Build trend chart data matching 24h PnL direction
  let sparklineData = [...portfolioHistory];
  if (totalUsd > 0) {
    const val24hStart = totalUsd - pnl24hUsd;
    if (sparklineData.length < 2) {
      sparklineData = [
        { time: "24h Ago", value: val24hStart },
        { time: "Now", value: totalUsd },
      ];
    } else if (sparklineData.length < 10) {
      sparklineData = [
        { time: "24h Ago", value: val24hStart },
        ...sparklineData,
      ];
    }
  }

  return (
    <div className="dashboard">
      {/* 1. Portfolio Value & Performance Card */}
      <div className="card portfolio-summary">
        <div className="portfolio-header-flex">
          <div>
            <h3 className="card-title">Portfolio Value & Performance</h3>
            <div className="portfolio-total" id="portfolio-total">
              ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="pnl-metrics">
            <div className={`pnl-badge ${is24hPos ? "pnl-up" : "pnl-down"}`}>
              <span className="pnl-label">24h PnL</span>
              <span className="pnl-value">
                {is24hPos ? "+" : ""}${pnl24hUsd.toFixed(2)} ({is24hPos ? "+" : ""}{pnl24hPct.toFixed(2)}%)
              </span>
            </div>
            <div className={`pnl-badge ${totalPnlUsd >= 0 ? "pnl-up" : "pnl-down"}`}>
              <span className="pnl-label">Total PnL</span>
              <span className="pnl-value">
                {totalDepositedUsd > 0 ? (
                  `${totalPnlUsd >= 0 ? "+" : ""}$${totalPnlUsd.toFixed(2)} (${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%)`
                ) : (
                  "$0.00 (0.00%)"
                )}
              </span>
            </div>
            <div className="pnl-badge pnl-drift">
              <span className="pnl-label">Total Absolute Drift</span>
              <span className="pnl-value">{totalAbsDrift.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Real-time Portfolio Value Sparkline Area Chart */}
        {sparklineData.length > 1 && (
          <div className="portfolio-sparkline-container" style={{ height: "120px", marginTop: "16px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparkColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={sparkColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#16172b",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                  }}
                  formatter={(val) => [`$${Number(val).toFixed(2)}`, "Portfolio Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparkColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Asset Grid */}
        <div className="asset-grid" style={{ marginTop: "20px" }}>
          {ASSET_SYMBOLS.map((sym, i) => {
            const isUsdt = sym === "USDT";
            return (
              <div
                key={sym}
                className={`asset-item ${selectedChartSymbol === sym ? "selected-asset" : ""} ${isUsdt ? "usdt-asset-item" : ""}`}
                onClick={() => !isUsdt && setSelectedChartSymbol(sym)}
                style={{ cursor: isUsdt ? "default" : "pointer" }}
              >
                <span className="asset-dot" style={{ background: ASSET_COLORS[i] }}></span>
                <span className="asset-name">{sym}</span>
                <span className="asset-value">
                  ${Number(ethers.formatEther(portfolioValue.assets[i] || 0n)).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="asset-price">
                  @{isUsdt ? "$1.00" : `$${(Number(prices[i] || 0n) / 1e8).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
            );
          })}
        </div>
        {loading && <div className="loading-bar"></div>}
      </div>

      {/* 2. Allocation & Deposit Row (50% / 50% Split Grid) */}
      <div className="dashboard-grid-2col">
        {/* Left: 2 Donut Charts (Target Allocation & Actual Allocation) */}
        <div className="grid-col">
          <div className="card side-charts-card" style={{ height: "100%" }}>
            <h3 className="card-title" style={{ marginBottom: "12px" }}>Allocation Distribution</h3>
            <div className="charts-row">
              {renderPieChart(targetData, "Target Allocation")}
              {renderPieChart(actualData, "Actual Allocation")}
            </div>
          </div>
        </div>

        {/* Right: Deposit + Target Allocation Sliders */}
        <div className="grid-col">
          {/* Deposit Card */}
          <div className="card">
            <h3 className="card-title">Deposit (Zap-in)</h3>
            <div className="input-group">
              <select
                id="select-deposit-asset"
                value={depositAsset}
                onChange={(e) => setDepositAsset(e.target.value)}
                className="input-select"
              >
                {ASSET_SYMBOLS.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
              <input
                id="input-deposit-amount"
                type="number"
                placeholder="Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="input-field"
              />
              <button
                id="btn-deposit"
                className="action-btn"
                onClick={handleDeposit}
                disabled={actionLoading}
              >
                Deposit
              </button>
            </div>
          </div>

          {/* Smart Range Slider Allocation Input */}
          <div className="card slider-allocation-card">
            <div className="card-header-flex">
              <h3 className="card-title">Target Allocation (%)</h3>
              <button className="action-btn btn-sm" onClick={handleEqualWeight}>
                ⚡ Equal Weight
              </button>
            </div>

            <div className="allocation-sliders-grid-3col">
              {ASSET_SYMBOLS.map((sym, i) => (
                <div key={sym} className="slider-group">
                  <div className="slider-label-row">
                    <span className="slider-sym" style={{ color: ASSET_COLORS[i] }}>
                      {sym}
                    </span>
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
                      />
                      <span>%</span>
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
                  />
                </div>
              ))}
            </div>

            {/* Real-time Total Progress Bar */}
            <div className="total-progress-container">
              <div className="progress-label-row">
                <span>Total Allocation:</span>
                <strong className={isAllocationValid ? "text-success" : "text-danger"}>
                  {sliderSum.toFixed(2)}% / 100%
                </strong>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${isAllocationValid ? "bg-success" : "bg-danger"}`}
                  style={{ width: `${Math.min(sliderSum, 100)}%` }}
                ></div>
              </div>

              {!isAllocationValid && (
                <div className="progress-warning">
                  ⚠️ {sliderSum < 100 ? `Total is ${sliderSum.toFixed(2)}%, missing ${(100 - sliderSum).toFixed(2)}%` : `Total exceeds 100% by ${(sliderSum - 100).toFixed(2)}%`}
                </div>
              )}
            </div>

            <div className="btn-row" style={{ marginTop: "16px" }}>
              <button
                id="btn-set-allocation"
                className="action-btn"
                onClick={handleSetAllocations}
                disabled={actionLoading || !isAllocationValid}
              >
                Set Allocation
              </button>
              <button
                id="btn-rebalance"
                className="action-btn action-btn-accent"
                onClick={handleRebalanceClick}
                disabled={actionLoading}
              >
                Rebalance
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Allocation Drift & Risk Monitoring Table */}
      <div className="card drift-card">
        <h3 className="card-title">Allocation Drift & Risk Monitoring</h3>
        <div className="table-container">
          <table className="data-table drift-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Price</th>
                <th>USD Balance</th>
                <th>Target %</th>
                <th>Actual %</th>
                <th>Drift %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssetMetrics.map((am) => {
                const isZeroAsset = am.usdValue < 0.01 && am.targetPct < 0.05;
                const absDrift = Math.abs(am.driftPct);
                const isZeroDrift = absDrift < 0.005;

                const isOver = am.driftPct >= 0.5;
                const isUnder = am.driftPct <= -0.5;
                const isBalanced = !isOver && !isUnder;

                let driftClass = "drift-zero";
                let prefix = "";

                if (!isZeroAsset && !isZeroDrift) {
                  if (am.driftPct > 0) {
                    driftClass = "drift-pos";
                    prefix = "+";
                  } else if (am.driftPct < 0) {
                    driftClass = "drift-neg";
                    prefix = "";
                  }
                }

                // Precision formatting: 2 decimals if small drift (<1%), 1 decimal if >=1%
                let driftStr = "0.00%";
                if (!isZeroAsset && !isZeroDrift) {
                  const numStr = absDrift < 1.0 ? absDrift.toFixed(2) : absDrift.toFixed(1);
                  driftStr = `${prefix}${am.driftPct > 0 ? numStr : "-" + numStr}%`;
                }

                return (
                  <tr key={am.name} className={isZeroAsset ? "row-zero-balance" : ""}>
                    <td>
                      <div className="asset-cell">
                        <span
                          className="asset-dot"
                          style={{
                            background: isZeroAsset ? "rgba(255, 255, 255, 0.15)" : am.color,
                          }}
                        ></span>
                        <strong style={{ opacity: isZeroAsset ? 0.45 : 1 }}>{am.name}</strong>
                      </div>
                    </td>
                    <td style={{ opacity: isZeroAsset ? 0.45 : 1 }}>
                      {am.name === "USDT" ? "$1.00" : `$${am.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                    </td>
                    <td style={{ opacity: isZeroAsset ? 0.45 : 1 }}>
                      ${am.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ opacity: isZeroAsset ? 0.45 : 1 }}>{am.targetPct.toFixed(1)}%</td>
                    <td style={{ opacity: isZeroAsset ? 0.45 : 1 }}>{am.actualPct.toFixed(1)}%</td>
                    <td>
                      <span className={`drift-badge ${driftClass}`}>
                        {driftStr}
                      </span>
                    </td>
                    <td>
                      {isOver && <span className="badge badge-over">OVERWEIGHT</span>}
                      {isUnder && <span className="badge badge-under">UNDERWEIGHT</span>}
                      {isBalanced && <span className="badge badge-balanced">BALANCED</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Interactive TradingView Price Chart */}
      <PriceChart
        selectedSymbol={selectedChartSymbol}
        onSelectSymbol={setSelectedChartSymbol}
      />

      {/* 5. Swap History Accordion */}
      <TransactionLog />

      {/* 2-Step Rebalance Review Modal */}
      <RebalanceReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleConfirmRebalance}
        balances={balances}
        targetAllocations={targetAllocations}
        prices={prices}
        totalUsd={totalUsd}
        actionLoading={actionLoading}
      />
    </div>
  );
}
