import json
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import requests
from scipy.optimize import minimize

ASSETS = ["bitcoin", "ethereum", "sui", "near"]
ASSET_SYMBOLS = ["BTC", "ETH", "SUI", "NEAR"]
RISK_FREE_RATE = 0.05
MARKET_PREMIUM = 0.08
TRADING_DAYS = 365
OUTPUT_FILE = "optimal_weights.json"


def fetch_price_data(days=365):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    frames = {}

    for asset_id, symbol in zip(ASSETS, ASSET_SYMBOLS):
        url = (
            f"https://api.coingecko.com/api/v3/coins/{asset_id}/market_chart/range"
            f"?vs_currency=usd"
            f"&from={int(start_date.timestamp())}"
            f"&to={int(end_date.timestamp())}"
        )
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        prices = data["prices"]
        df = pd.DataFrame(prices, columns=["timestamp", symbol])
        df["date"] = pd.to_datetime(df["timestamp"], unit="ms").dt.date
        df = df.groupby("date")[symbol].last().reset_index()
        df.set_index("date", inplace=True)
        frames[symbol] = df[symbol]

    price_df = pd.DataFrame(frames)
    price_df.index = pd.to_datetime(price_df.index)
    price_df.sort_index(inplace=True)
    price_df.interpolate(method="linear", inplace=True)
    price_df.dropna(inplace=True)

    return price_df


def compute_returns_and_covariance(price_df):
    daily_returns = price_df.pct_change().dropna()
    mean_daily_returns = daily_returns.mean()
    cov_matrix = daily_returns.cov()
    annualized_returns = mean_daily_returns * TRADING_DAYS
    annualized_cov = cov_matrix * TRADING_DAYS

    return daily_returns, annualized_returns, annualized_cov


def compute_capm_returns(daily_returns, annualized_returns):
    market_returns = daily_returns.mean(axis=1)
    betas = {}

    for symbol in ASSET_SYMBOLS:
        cov_with_market = daily_returns[symbol].cov(market_returns)
        market_var = market_returns.var()
        betas[symbol] = cov_with_market / market_var if market_var > 0 else 1.0

    capm_returns = pd.Series(
        {
            symbol: RISK_FREE_RATE + betas[symbol] * MARKET_PREMIUM
            for symbol in ASSET_SYMBOLS
        }
    )

    return capm_returns, betas


def neg_sharpe_ratio(weights, expected_returns, cov_matrix):
    portfolio_return = np.dot(weights, expected_returns)
    portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix.values, weights)))
    if portfolio_vol == 0:
        return 1e10
    sharpe = (portfolio_return - RISK_FREE_RATE) / portfolio_vol
    return -sharpe


def optimize_sharpe(expected_returns, cov_matrix):
    n = len(expected_returns)
    initial_weights = np.array([1.0 / n] * n)

    constraints = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}
    bounds = tuple((0.0, 1.0) for _ in range(n))

    result = minimize(
        neg_sharpe_ratio,
        initial_weights,
        args=(expected_returns.values, cov_matrix),
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 1000, "ftol": 1e-12},
    )

    if not result.success:
        print(f"WARNING: {result.message}", file=sys.stderr)

    return result.x


def export_weights(weights, expected_returns, cov_matrix):
    portfolio_return = np.dot(weights, expected_returns.values)
    portfolio_vol = np.sqrt(
        np.dot(weights.T, np.dot(cov_matrix.values, weights))
    )
    sharpe = (portfolio_return - RISK_FREE_RATE) / portfolio_vol if portfolio_vol > 0 else 0

    allocation_bps = [int(round(w * 10000)) for w in weights]
    diff = 10000 - sum(allocation_bps)
    if diff != 0:
        max_idx = int(np.argmax(allocation_bps))
        allocation_bps[max_idx] += diff

    output = {
        "generated_at": datetime.now().isoformat(),
        "risk_free_rate": RISK_FREE_RATE,
        "market_premium": MARKET_PREMIUM,
        "assets": ASSET_SYMBOLS,
        "weights_decimal": [round(float(w), 6) for w in weights],
        "weights_basis_points": allocation_bps,
        "portfolio_metrics": {
            "expected_annual_return": round(float(portfolio_return), 6),
            "annual_volatility": round(float(portfolio_vol), 6),
            "sharpe_ratio": round(float(sharpe), 6),
        },
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    return output


def main():
    print("Fetching historical price data...")
    price_df = fetch_price_data()
    print(f"Loaded {len(price_df)} daily records for {list(price_df.columns)}")

    print("Computing returns and covariance matrix...")
    daily_returns, annualized_returns, annualized_cov = compute_returns_and_covariance(
        price_df
    )

    print("Computing CAPM expected returns...")
    capm_returns, betas = compute_capm_returns(daily_returns, annualized_returns)

    print("Optimizing portfolio via Sharpe ratio maximization...")
    optimal_weights = optimize_sharpe(capm_returns, annualized_cov)

    print("Exporting results...")
    output = export_weights(optimal_weights, capm_returns, annualized_cov)

    print(f"\nOptimal Allocation:")
    for symbol, w, bps in zip(
        ASSET_SYMBOLS, output["weights_decimal"], output["weights_basis_points"]
    ):
        print(f"  {symbol}: {w*100:.2f}% ({bps} bps)")

    print(f"\nPortfolio Metrics:")
    metrics = output["portfolio_metrics"]
    print(f"  Expected Return: {metrics['expected_annual_return']*100:.2f}%")
    print(f"  Volatility:      {metrics['annual_volatility']*100:.2f}%")
    print(f"  Sharpe Ratio:    {metrics['sharpe_ratio']:.4f}")
    print(f"\nSaved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
