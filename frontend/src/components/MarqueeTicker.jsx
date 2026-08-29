import { useEffect, useState } from "react";
import { ASSET_SYMBOLS, BINANCE_SYMBOLS, ASSET_COLORS } from "../config/contracts";

export default function MarqueeTicker() {
  const [tickerData, setTickerData] = useState([]);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const symbols = Object.values(BINANCE_SYMBOLS);
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`
        );
        if (!res.ok) return;
        const data = await res.json();

        const items = ASSET_SYMBOLS.map((sym, idx) => {
          if (sym === "USDT") {
            return {
              symbol: "USDT",
              price: 1.0,
              change: 0.0,
              color: ASSET_COLORS[idx],
            };
          }
          const bSym = BINANCE_SYMBOLS[sym];
          const found = data.find((d) => d.symbol === bSym);
          return {
            symbol: sym,
            price: found ? parseFloat(found.lastPrice) : 0,
            change: found ? parseFloat(found.priceChangePercent) : 0,
            color: ASSET_COLORS[idx],
          };
        });

        setTickerData(items);
      } catch (err) {
        console.error("Marquee ticker fetch failed:", err);
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 15000);
    return () => clearInterval(interval);
  }, []);

  if (tickerData.length === 0) return null;

  // Duplicate list to create seamless infinite scrolling loop
  const displayItems = [...tickerData, ...tickerData];

  return (
    <div className="marquee-bar">
      <div className="marquee-track">
        {displayItems.map((item, index) => (
          <div key={`${item.symbol}-${index}`} className="marquee-item">
            <span className="marquee-dot" style={{ background: item.color }}></span>
            <span className="marquee-sym">{item.symbol}</span>
            <span className="marquee-price">
              ${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`marquee-change ${item.change >= 0 ? "up" : "down"}`}>
              {item.change >= 0 ? "+" : ""}
              {item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
