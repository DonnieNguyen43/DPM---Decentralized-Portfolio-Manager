import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  PORTFOLIO_MANAGER_ADDRESS,
  PRICE_ORACLE_ADDRESS,
  PORTFOLIO_MANAGER_ABI,
  PRICE_ORACLE_ABI,
  ERC20_ABI,
  TOKEN_ADDRESSES,
  ASSET_SYMBOLS,
  BINANCE_SYMBOLS,
} from "../config/contracts";

const PortfolioContext = createContext(null);

const HISTORY_STORAGE_KEY = "dpm_portfolio_value_history";

export function PortfolioProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [nativeBalance, setNativeBalance] = useState("0");
  const [balances, setBalances] = useState(Array(10).fill(0n));
  const [targetAllocations, setTargetAllocations] = useState(Array(10).fill(0n));
  const [portfolioValue, setPortfolioValue] = useState({ total: 0n, assets: Array(10).fill(0n) });
  const [prices, setPrices] = useState(Array(10).fill(0n));
  const [swapEvents, setSwapEvents] = useState([]);
  
  // Cost Basis & Real-time PnL states
  const [totalDepositedUsd, setTotalDepositedUsd] = useState(0);
  const [pnl24hUsd, setPnl24hUsd] = useState(0);
  const [pnl24hPct, setPnl24hPct] = useState(0);
  const [portfolioHistory, setPortfolioHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  const getPortfolioContract = useCallback((runner) => {
    return new ethers.Contract(PORTFOLIO_MANAGER_ADDRESS, PORTFOLIO_MANAGER_ABI, runner);
  }, []);

  const getOracleContract = useCallback((runner) => {
    return new ethers.Contract(PRICE_ORACLE_ADDRESS, PRICE_ORACLE_ABI, runner);
  }, []);

  // Cost Basis helper to read or anchor initial cost basis in localStorage
  const getOrInitCostBasis = useCallback((userAddress, currentValUsd) => {
    if (!userAddress) return 0;
    const key = `dpm_cost_basis_${userAddress.toLowerCase()}`;
    const timeKey = `dpm_first_deposit_time_${userAddress.toLowerCase()}`;
    try {
      if (currentValUsd <= 0) {
        localStorage.removeItem(key);
        localStorage.removeItem(timeKey);
        return 0;
      }
      const saved = localStorage.getItem(key);
      if (saved && parseFloat(saved) > 0) {
        return parseFloat(saved);
      }
      if (currentValUsd > 0) {
        localStorage.setItem(key, currentValUsd.toString());
        return currentValUsd;
      }
    } catch (e) {
      console.warn("Storage access error:", e);
    }
    return 0;
  }, []);

  // Track initial deposit / position opening timestamp in localStorage
  const getOrInitDepositTime = useCallback((userAddress) => {
    if (!userAddress) return Date.now();
    const key = `dpm_first_deposit_time_${userAddress.toLowerCase()}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved && parseInt(saved) > 0) {
        return parseInt(saved);
      }
      const now = Date.now();
      localStorage.setItem(key, now.toString());
      return now;
    } catch {
      return Date.now();
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this dApp");
      return;
    }
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const userSigner = await browserProvider.getSigner();
      const userAddress = accounts[0];

      setProvider(browserProvider);
      setSigner(userSigner);
      setAccount(userAddress);

      const bal = await browserProvider.getBalance(userAddress);
      setNativeBalance(ethers.formatEther(bal));

      try {
        const savedBasis = localStorage.getItem(`dpm_cost_basis_${userAddress.toLowerCase()}`);
        if (savedBasis) {
          setTotalDepositedUsd(parseFloat(savedBasis) || 0);
        }
      } catch (e) {
        console.warn("Could not load cost basis from storage:", e);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setNativeBalance("0");
    setBalances(Array(10).fill(0n));
    setTargetAllocations(Array(10).fill(0n));
    setPortfolioValue({ total: 0n, assets: Array(10).fill(0n) });
    setSwapEvents([]);
    setTotalDepositedUsd(0);
    setPnl24hUsd(0);
    setPnl24hPct(0);
  }, []);

  // Fetch real-time spot prices from Binance ticker
  const fetchLivePrices = useCallback(async () => {
    try {
      const symbols = Object.values(BINANCE_SYMBOLS);
      const url = `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`;
      const res = await fetch(url);
      if (!res.ok) return {};
      const data = await res.json();
      const priceMap = {};
      data.forEach((item) => {
        const assetSym = Object.keys(BINANCE_SYMBOLS).find(
          (k) => BINANCE_SYMBOLS[k] === item.symbol
        );
        if (assetSym) {
          priceMap[assetSym] = parseFloat(item.price);
        }
      });
      priceMap["USDT"] = 1.0;
      return priceMap;
    } catch (e) {
      console.warn("Live Binance price fetch failed:", e);
      return {};
    }
  }, []);

  // Fetch 24hr Binance Price Change %
  const fetch24hBinanceTicker = useCallback(async () => {
    try {
      const symbols = Object.values(BINANCE_SYMBOLS);
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`;
      const res = await fetch(url);
      if (!res.ok) return {};
      const data = await res.json();

      const changeMap = {};
      data.forEach((item) => {
        const assetSym = Object.keys(BINANCE_SYMBOLS).find(
          (k) => BINANCE_SYMBOLS[k] === item.symbol
        );
        if (assetSym) {
          changeMap[assetSym] = parseFloat(item.priceChangePercent);
        }
      });
      return changeMap;
    } catch (e) {
      console.error("Failed to fetch Binance 24h ticker:", e);
      return {};
    }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    if (!provider || !account) return;
    try {
      const contract = getPortfolioContract(provider);
      const oracle = getOracleContract(provider);

      const [bals, allocs, oraclePrices, livePriceMap] = await Promise.all([
        contract.getInvestorBalances(account),
        contract.getTargetAllocations(account),
        oracle.getLatestPrices(),
        fetchLivePrices(),
      ]);

      const assetUsdValues = [];
      const updatedPricesArr = [];
      let calculatedTotalUsd = 0;

      ASSET_SYMBOLS.forEach((sym, i) => {
        const balNum = Number(ethers.formatEther(bals[i] || 0n));
        const oracleP = Number(oraclePrices[i] || 0n) / 1e8;
        const liveP = livePriceMap[sym] || oracleP;
        const assetUsd = balNum * liveP;

        calculatedTotalUsd += assetUsd;
        assetUsdValues.push(ethers.parseEther(assetUsd.toFixed(18)));
        updatedPricesArr.push(BigInt(Math.round(liveP * 1e8)));
      });

      const totalUsdBN = ethers.parseEther(calculatedTotalUsd.toFixed(18));

      setBalances(bals.map((b) => b));
      setTargetAllocations(allocs.map((a) => a));
      setPortfolioValue({
        total: totalUsdBN,
        assets: assetUsdValues,
      });
      setPrices(updatedPricesArr);

      // Cost basis & PnL
      const costBasis = getOrInitCostBasis(account, calculatedTotalUsd);
      setTotalDepositedUsd(costBasis);

      const calcTotalPnlUsd = costBasis > 0 ? calculatedTotalUsd - costBasis : 0;
      const calcTotalPnlPct = costBasis > 0 ? (calcTotalPnlUsd / costBasis) * 100 : 0;

      const firstDepTime = getOrInitDepositTime(account);
      const isLessThan24h = Date.now() - firstDepTime < 86400 * 1000;

      let calc24hUsd = 0;
      let calc24hPct = 0;

      if (isLessThan24h) {
        calc24hUsd = calcTotalPnlUsd;
        calc24hPct = calcTotalPnlPct;
      } else {
        const changeMap = await fetch24hBinanceTicker();
        ASSET_SYMBOLS.forEach((sym, i) => {
          const assetUsd = Number(ethers.formatEther(assetUsdValues[i] || 0n));
          const pctChange = changeMap[sym] || 0;
          calc24hUsd += assetUsd * (pctChange / 100);
        });
        calc24hPct = calculatedTotalUsd > 0 ? (calc24hUsd / calculatedTotalUsd) * 100 : 0;
      }

      setPnl24hUsd(calc24hUsd);
      setPnl24hPct(calc24hPct);

      // Portfolio History Sparkline
      if (calculatedTotalUsd > 0) {
        setPortfolioHistory((prev) => {
          const timeLabel = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const lastPoint = prev[prev.length - 1];
          if (lastPoint && Math.abs(lastPoint.value - calculatedTotalUsd) < 0.001) {
            return prev;
          }
          const next = [...prev, { time: timeLabel, value: calculatedTotalUsd }];
          const trimmed = next.slice(-30);
          try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
          } catch (e) {
            console.warn("Could not save history:", e);
          }
          return trimmed;
        });
      } else {
        setPortfolioHistory([]);
        try {
          localStorage.removeItem(HISTORY_STORAGE_KEY);
        } catch (e) {
          console.warn("Could not clear history:", e);
        }
      }
    } catch (err) {
      console.error("Portfolio refresh failed:", err);
    }
  }, [provider, account, getPortfolioContract, getOracleContract, getOrInitCostBasis, getOrInitDepositTime, fetchLivePrices, fetch24hBinanceTicker]);

  const fetchSwapHistory = useCallback(async () => {
    if (!provider || !account) return;
    try {
      const contract = getPortfolioContract(provider);
      const events = await contract.queryFilter("SwapExecuted", 0, "latest");

      const userEvents = events.filter(
        (e) => e.args && e.args[0] && e.args[0].toLowerCase() === account.toLowerCase()
      );

      const parsed = await Promise.all(
        userEvents.map(async (e) => {
          let blockTimestamp = Math.floor(Date.now() / 1000);
          try {
            const block = await e.getBlock();
            if (block && block.timestamp) {
              blockTimestamp = block.timestamp;
            }
          } catch {
            // fallback
          }

          return {
            hash: e.transactionHash,
            tokenIn: e.args[1],
            tokenOut: e.args[2],
            amountIn: e.args[3],
            amountOut: e.args[4],
            blockNumber: e.blockNumber,
            timestamp: blockTimestamp,
          };
        })
      );

      parsed.sort((a, b) => b.blockNumber - a.blockNumber);
      setSwapEvents(parsed);
    } catch (err) {
      console.error("Failed to fetch swap history:", err);
    }
  }, [provider, account, getPortfolioContract]);

  const deposit = useCallback(
    async (tokenSymbol, amount) => {
      if (!signer) return;
      try {
        const contract = getPortfolioContract(signer);
        const assetIndex = ASSET_SYMBOLS.indexOf(tokenSymbol);
        if (assetIndex === -1) throw new Error("Invalid asset symbol");

        const tokenAddr = TOKEN_ADDRESSES[tokenSymbol];
        const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(account, PORTFOLIO_MANAGER_ADDRESS);
        if (allowance < amount) {
          const approveTx = await tokenContract.approve(PORTFOLIO_MANAGER_ADDRESS, ethers.MaxUint256);
          await approveTx.wait();
        }
        const tx = await contract.deposit(assetIndex, amount);
        await tx.wait();

        const amountNum = Number(ethers.formatEther(amount));
        const priceNum = tokenSymbol === "USDT" ? 1.0 : Number(prices[assetIndex] || 0n) / 1e8;
        const depositUsdVal = amountNum * priceNum;

        setTotalDepositedUsd((prev) => {
          const newBasis = prev + depositUsdVal;
          if (account) {
            try {
              localStorage.setItem(`dpm_cost_basis_${account.toLowerCase()}`, newBasis.toString());
              if (!localStorage.getItem(`dpm_first_deposit_time_${account.toLowerCase()}`)) {
                localStorage.setItem(`dpm_first_deposit_time_${account.toLowerCase()}`, Date.now().toString());
              }
            } catch (e) {
              console.warn("Could not update cost basis in storage:", e);
            }
          }
          return newBasis;
        });

        await refreshPortfolio();
      } catch (err) {
        if (err.code === "ACTION_REJECTED" || err.code === 4001) {
          console.warn("User rejected the transaction");
          return;
        }
        console.error("Deposit failed:", err);
        throw err;
      }
    },
    [signer, prices, account, getPortfolioContract, refreshPortfolio]
  );

  const setAllocations = useCallback(
    async (allocations) => {
      if (!signer) return;
      try {
        const contract = getPortfolioContract(signer);
        const tx = await contract.setTargetAllocation(allocations);
        await tx.wait();
        await refreshPortfolio();
      } catch (err) {
        if (err.code === "ACTION_REJECTED" || err.code === 4001) {
          console.warn("User rejected the transaction");
          return;
        }
        console.error("Set allocation failed:", err);
        throw err;
      }
    },
    [signer, getPortfolioContract, refreshPortfolio]
  );

  const rebalance = useCallback(async () => {
    if (!signer) return;
    try {
      const contract = getPortfolioContract(signer);
      const tx = await contract.executeRebalance({ gasLimit: 3000000 });
      await tx.wait();
      await fetchSwapHistory();
      await refreshPortfolio();
    } catch (err) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        console.warn("User rejected the transaction");
        return;
      }
      console.error("Rebalance failed:", err);
      throw err;
    }
  }, [signer, getPortfolioContract, fetchSwapHistory, refreshPortfolio]);

  useEffect(() => {
    if (!account || !provider) return;
    refreshPortfolio();
    fetchSwapHistory();

    const interval = setInterval(() => {
      refreshPortfolio();
    }, 3000);

    return () => clearInterval(interval);
  }, [account, provider, refreshPortfolio, fetchSwapHistory]);

  useEffect(() => {
    if (!provider || !account) return;
    const contract = getPortfolioContract(provider);

    const handleSwap = (...args) => {
      const user = args[0];
      if (user && user.toLowerCase() === account.toLowerCase()) {
        fetchSwapHistory();
        refreshPortfolio();
      }
    };

    contract.on("SwapExecuted", handleSwap);
    return () => {
      contract.off("SwapExecuted", handleSwap);
    };
  }, [provider, account, getPortfolioContract, fetchSwapHistory, refreshPortfolio]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [disconnectWallet]);

  // Derived Total PnL
  const currentTotalUsd = Number(ethers.formatEther(portfolioValue.total));
  const totalPnlUsd = totalDepositedUsd > 0 ? currentTotalUsd - totalDepositedUsd : 0;
  const totalPnlPct = totalDepositedUsd > 0 ? (totalPnlUsd / totalDepositedUsd) * 100 : 0;

  return (
    <PortfolioContext.Provider
      value={{
        account,
        provider,
        signer,
        nativeBalance,
        balances,
        targetAllocations,
        portfolioValue,
        prices,
        swapEvents,
        portfolioHistory,
        totalDepositedUsd,
        totalPnlUsd,
        totalPnlPct,
        pnl24hUsd,
        pnl24hPct,
        loading,
        connectWallet,
        disconnectWallet,
        refreshPortfolio,
        deposit,
        setAllocations,
        rebalance,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
}
