import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { usePortfolio } from "../hooks/usePortfolio";
import { ASSET_SYMBOLS, ASSET_COLORS } from "../config/contracts";
import { useToast } from "./shared/Toast";

// Sub-components
import PortfolioSummary from "./portfolio/PortfolioSummary";
import AllocationCharts from "./portfolio/AllocationCharts";
import DriftTable       from "./portfolio/DriftTable";
import DepositForm      from "./portfolio/DepositForm";
import AllocationSliders from "./allocation/AllocationSliders";
import PriceChart       from "./PriceChart";
import RebalanceReviewModal from "./RebalanceReviewModal";
import TransactionLog   from "./TransactionLog";
import { SkeletonCard } from "./shared/SkeletonLoader";

// ─── Empty / Not Connected state ──────────────────────────────────────────────
function NotConnected() {
  return (
    <div className="card empty-state" role="status">
      <div className="empty-icon" aria-hidden="true">📊</div>
      <h3>Connect Your Wallet</h3>
      <p>Connect a wallet to view your DeFi portfolio, manage allocations, and rebalance on Optimism.</p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
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

  const { toastSuccess, toastError, toastWarn, toastPending, updateToast } = useToast();

  const NUM_ASSETS = ASSET_SYMBOLS.length;

  const [allocationInputs, setAllocationInputs]   = useState(Array(NUM_ASSETS).fill("0.00"));
  const [hasInitializedSliders, setHasInitializedSliders] = useState(false);
  const [actionLoading, setActionLoading]         = useState(false);
  const [selectedChartSymbol, setSelectedChartSymbol] = useState("WBTC");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // ── Sync target allocation sliders ONCE on initial load ──
  useEffect(() => {
    if (hasInitializedSliders || !targetAllocations || targetAllocations.length === 0) return;

    const hasContractTargets = targetAllocations.some((a) => Number(a) > 0);

    if (hasContractTargets) {
      const synced = targetAllocations.map((a) => (Number(a) / 100).toFixed(2));
      setAllocationInputs(synced);
      setHasInitializedSliders(true);
    } else if (portfolioValue && portfolioValue.total > 0n) {
      const totalUsd = Number(ethers.formatEther(portfolioValue.total));
      const synced   = ASSET_SYMBOLS.map((_, i) => {
        const assetUsd = Number(ethers.formatEther(portfolioValue.assets[i] || 0n));
        return ((assetUsd / totalUsd) * 100).toFixed(2);
      });
      setAllocationInputs(synced);
      setHasInitializedSliders(true);
    } else {
      const equalVal = (100 / NUM_ASSETS).toFixed(2);
      const lastVal  = (100 - parseFloat(equalVal) * (NUM_ASSETS - 1)).toFixed(2);
      const copy     = Array(NUM_ASSETS).fill(equalVal);
      copy[NUM_ASSETS - 1] = lastVal;
      setAllocationInputs(copy);
      setHasInitializedSliders(true);
    }
  }, [targetAllocations, portfolioValue, hasInitializedSliders, NUM_ASSETS]);

  if (!account) return <NotConnected />;

  // Show skeleton if loading and no data yet
  if (loading && portfolioValue.total === 0n) {
    return (
      <div className="dashboard">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={2} />
      </div>
    );
  }

  // ── Computed metrics ──────────────────────────────────────────────────────
  const totalUsd = Number(ethers.formatEther(portfolioValue.total));
  let totalAbsDrift = 0;

  const assetMetrics = ASSET_SYMBOLS.map((sym, i) => {
    const assetUsd  = Number(ethers.formatEther(portfolioValue.assets[i] || 0n));
    const priceNum  = Number(prices[i] || 0n) / 1e8;
    const actualPct = totalUsd > 0 ? (assetUsd / totalUsd) * 100 : 0;
    const targetPct = Number(targetAllocations[i] || 0n) / 100;
    const driftPct  = actualPct - targetPct;
    totalAbsDrift  += Math.abs(driftPct);

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

  const sortedAssetMetrics = [...assetMetrics].sort((a, b) => {
    const valA = a.usdValue > 0 ? a.usdValue : Math.max(a.targetPct, a.actualPct);
    const valB = b.usdValue > 0 ? b.usdValue : Math.max(b.targetPct, b.actualPct);
    return valB - valA;
  });

  const sliderSum       = allocationInputs.reduce((s, v) => s + (parseFloat(v || "0") || 0), 0);
  const isAllocationValid = Math.abs(sliderSum - 100) < 0.01;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRebalanceClick = async () => {
    if (totalUsd === 0) {
      toastWarn("Portfolio is Empty", {
        message: "Please deposit tokens before running a rebalance.",
      });
      return;
    }

    // Save allocation on-chain first (1 TX) if sliders have changed
    if (isAllocationValid) {
      const bps = allocationInputs.map((v) => Math.round(parseFloat(v || "0") * 100));
      const needsUpdate = targetAllocations.some((a, i) => Number(a) !== bps[i]);
      if (needsUpdate) {
        const saveId = toastPending("Saving allocation on-chain…", {
          message: "Please confirm in MetaMask",
        });
        try {
          await setAllocations(bps);
          updateToast(saveId, {
            type: "success",
            title: "Allocation Saved",
            message: "Target allocations updated on-chain.",
          });
        } catch (err) {
          const reason = err?.reason || err?.message || "";
          if (!reason.includes("user rejected") && !reason.includes("ACTION_REJECTED")) {
            updateToast(saveId, { type: "error", title: "Save Failed", message: reason });
          } else {
            updateToast(saveId, { type: "warn", title: "Cancelled", message: "You rejected the transaction." });
          }
          return; // Don't open modal if allocation save failed
        }
      }
    }

    setIsReviewModalOpen(true);
  };

  const handleConfirmRebalance = async () => {
    setActionLoading(true);
    const pendingId = toastPending("Executing rebalance on-chain…", {
      message: "Awaiting MetaMask confirmation",
    });

    try {
      const tx = await rebalance();

      updateToast(pendingId, {
        type: "success",
        title: "Rebalance Complete!",
        message: "Your portfolio has been realigned to target allocations.",
        txHash: tx?.hash,
        explorerUrl: "https://optimistic.etherscan.io",
      });

      setHasInitializedSliders(false);
      setTimeout(() => {
        setIsReviewModalOpen(false);
      }, 1000);
    } catch (err) {
      const reason = err?.reason || err?.message || "";
      if (!reason.includes("user rejected") && !reason.includes("ACTION_REJECTED")) {
        updateToast(pendingId, {
          type: "error",
          title: "Rebalance Failed",
          message: err?.reason || "Swap transaction failed. Check gas and try again.",
        });
      } else {
        updateToast(pendingId, {
          type: "warn",
          title: "Rebalance Cancelled",
          message: "You rejected the transaction in MetaMask.",
        });
      }
      setIsReviewModalOpen(false);
      console.error("Rebalance failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">

      {/* 1. Portfolio Summary — Total Value, PnL badges, Sparkline, Asset Grid */}
      <div className="card portfolio-summary">
        <PortfolioSummary
          portfolioValue={portfolioValue}
          totalDepositedUsd={totalDepositedUsd}
          totalPnlUsd={totalPnlUsd}
          totalPnlPct={totalPnlPct}
          pnl24hUsd={pnl24hUsd}
          pnl24hPct={pnl24hPct}
          portfolioHistory={portfolioHistory}
          prices={prices}
          totalAbsDrift={totalAbsDrift}
          loading={loading}
          selectedChartSymbol={selectedChartSymbol}
          onSelectSymbol={setSelectedChartSymbol}
        />
      </div>

      {/* 2. Allocation Charts + Deposit & Sliders (50/50 grid) */}
      <div className="dashboard-grid-2col">
        <div className="grid-col">
          <AllocationCharts
            assetMetrics={assetMetrics}
            totalUsd={totalUsd}
          />
        </div>

        <div className="grid-col">
          <DepositForm deposit={deposit} />
          <AllocationSliders
            allocationInputs={allocationInputs}
            setAllocationInputs={setAllocationInputs}
            setAllocations={setAllocations}
            onRebalanceClick={handleRebalanceClick}
            actionLoading={actionLoading}
            targetAllocations={targetAllocations}
          />
        </div>
      </div>

      {/* 3. Drift & Risk Table */}
      <DriftTable sortedAssetMetrics={sortedAssetMetrics} />

      {/* 4. Live Price Chart */}
      <PriceChart
        selectedSymbol={selectedChartSymbol}
        onSelectSymbol={setSelectedChartSymbol}
      />

      {/* 5. Transaction Log */}
      <TransactionLog />

      {/* Rebalance Review Modal */}
      <RebalanceReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => !actionLoading && setIsReviewModalOpen(false)}
        onConfirm={handleConfirmRebalance}
        balances={balances}
        targetAllocations={
          isAllocationValid
            ? allocationInputs.map((v) => BigInt(Math.round(parseFloat(v || "0") * 100)))
            : targetAllocations
        }
        prices={prices}
        totalUsd={totalUsd}
        actionLoading={actionLoading}
      />
    </div>
  );
}
