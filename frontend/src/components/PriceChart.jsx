import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { BINANCE_SYMBOLS, EXTENDED_ASSET_SYMBOLS } from "../config/contracts";

const TIMEFRAMES = [
  { label: "1m", value: "1m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "1d", value: "1d" },
];

export default function PriceChart({ selectedSymbol, onSelectSymbol }) {
  const [activeSymbol, setActiveSymbol] = useState(selectedSymbol || "WBTC");
  const [interval, setInterval] = useState("1m");
  const [latestPrice, setLatestPrice] = useState(null);
  const [priceChangePct, setPriceChangePct] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const wsRef = useRef(null);

  const currentToken = activeSymbol || selectedSymbol || "WBTC";
  const binanceSymbol = BINANCE_SYMBOLS[currentToken] || "BTCUSDT";

  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== activeSymbol) {
      setActiveSymbol(selectedSymbol);
    }
  }, [selectedSymbol]);

  const handleTokenChange = (sym) => {
    setActiveSymbol(sym);
    if (onSelectSymbol) {
      onSelectSymbol(sym);
    }
  };

  // Initialize Chart Instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0d0e17" },
        textColor: "#8f96a3",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: true,
      handleScroll: true,
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update Series Data and WebSocket Stream when Token or Interval changes
  useEffect(() => {
    if (!chartRef.current) return;

    let isMounted = true;

    // Close previous WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Remove old series if present to reset vertical price scale bounds
    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
      } catch (e) {
        console.warn("Could not remove old series:", e);
      }
      seriesRef.current = null;
    }

    // Create fresh candlestick series for selected coin
    const newSeries = chartRef.current.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    seriesRef.current = newSeries;

    const fetchHistory = async () => {
      try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=100`;
        const res = await fetch(url);
        const data = await res.json();
        if (!isMounted || !Array.isArray(data) || !seriesRef.current) return;

        const formatted = data.map((d) => ({
          time: Math.floor(d[0] / 1000),
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        newSeries.setData(formatted);

        if (formatted.length > 0) {
          const last = formatted[formatted.length - 1];
          const first = formatted[0];
          setLatestPrice(last.close);
          const pct = ((last.close - first.open) / first.open) * 100;
          setPriceChangePct(pct);
        }

        if (chartRef.current) {
          chartRef.current.priceScale("right").applyOptions({ autoScale: true });
          chartRef.current.timeScale().fitContent();
        }
      } catch (err) {
        console.error("Failed to fetch klines:", err);
      }
    };

    fetchHistory();

    const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      if (!isMounted || !seriesRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.e === "kline") {
          const k = msg.k;
          const candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
          };
          seriesRef.current.update(candle);
          setLatestPrice(candle.close);
        }
      } catch (e) {
        console.error("WS message error:", e);
      }
    };

    return () => {
      isMounted = false;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [currentToken, binanceSymbol, interval]);

  return (
    <div className="price-chart-card card">
      <div className="price-chart-header">
        <div className="price-chart-token-select">
          <div className="token-tabs">
            {EXTENDED_ASSET_SYMBOLS.map((sym) => (
              <button
                key={sym}
                className={`token-tab ${sym === currentToken ? "active" : ""}`}
                onClick={() => handleTokenChange(sym)}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        <div className="price-chart-meta">
          {latestPrice !== null && (
            <div className="price-badge">
              <span className="price-amount">
                ${latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              {priceChangePct !== null && (
                <span className={`price-change ${priceChangePct >= 0 ? "up" : "down"}`}>
                  {priceChangePct >= 0 ? "+" : ""}
                  {priceChangePct.toFixed(2)}%
                </span>
              )}
            </div>
          )}

          <div className="interval-tabs">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                className={`interval-tab ${interval === tf.value ? "active" : ""}`}
                onClick={() => setInterval(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="price-chart-body"
        ref={chartContainerRef}
        style={{ height: "clamp(240px, 30vw, 380px)", width: "100%" }}
        aria-label={`${currentToken} price chart`}
        role="img"
      />
    </div>
  );
}
