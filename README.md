# 🛡️ DPM — Decentralized Portfolio Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636.svg?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22.0-yellow.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF.svg?logo=vite)](https://vitejs.org/)

**Decentralized Portfolio Manager (DPM)** is a state-of-the-art non-custodial Web3 protocol for automated multi-asset crypto portfolio management. It features real-time Binance price oracle syncing, asset-tiered drift tolerance monitoring, 2-step simulated execution review, account-isolated PnL tracking, and an automated rebalance keeper bot.

---

<img width="1841" height="698" alt="image" src="https://github.com/user-attachments/assets/51fa2b89-c4eb-4dd0-aec7-a05395aea009" />

---

## ✨ Core Features & Key Innovations

### 1. 10-Asset Non-Custodial Portfolio & USDT Zap-In
- Non-custodial support for 10 crypto assets: `WBTC`, `WETH`, `SOL`, `BNB`, `LINK`, `SUI`, `NEAR`, `ARB`, `OP`, and `USDT`.
- **USDT Zap-In**: Single-click deposit using USDT with automatic account auto-minting for local test environments.

<img width="1775" height="727" alt="image" src="https://github.com/user-attachments/assets/a07d351c-d25c-4349-930b-ea6360e44480" />

---

### 2. Multi-State Asset-Tiered Risk Monitoring (`ASSET_DRIFT_TIERS`)
Instead of a rigid single threshold, DPM dynamically evaluates drift tolerance and risk status based on asset volatility tiers:
- **Tier 1 (Mega-Cap Core - WBTC, WETH)**: $\pm 2.5\%$ Warning | $\pm 5.0\%$ Action Trigger
- **Tier 2 (Large-Cap L1 - SOL, BNB)**: $\pm 3.5\%$ Warning | $\pm 7.0\%$ Action Trigger
- **Tier 3 (Growth & Mid-Cap - LINK, SUI, NEAR)**: $\pm 5.0\%$ Warning | $\pm 10.0\%$ Action Trigger
- **Tier 4 (Satellite & Volatile - ARB, OP)**: $\pm 7.5\%$ Warning | $\pm 15.0\%$ Action Trigger
- **Tier 5 (Stablecoin - USDT)**: $\pm 2.0\%$ Warning | $\pm 5.0\%$ Action Trigger

#### Dynamic Multi-State Status Badges:
- `BALANCED`: Drift is within normal warning tolerance.
- `OVERWEIGHT` / `UNDERWEIGHT`: Drift exceeds warning threshold but below trigger.
- `CRITICAL OVER` / `CRITICAL UNDER`: Drift reaches or exceeds action trigger threshold (glowing warning badges).

<img width="1702" height="607" alt="image" src="https://github.com/user-attachments/assets/bbb700e1-308c-4412-9738-9b52474b6b1a" />

---

### 3. Bounded Multi-Pass Smart Rebalancing & 2-Step Execution Review
- **Exact Math Swaps**: Refactored `PortfolioManager.sol` uses bounded iterative matching (`swapUsd = Math.min(excessUsd, maxDeficitUsd)`) to realign asset allocations without overshooting or residual drift.
- **Review Modal**: 2-step execution review showing simulated swap routes, sell/buy token amounts, estimated outputs, gas estimation, slippage tolerance, and Before vs After allocation previews.

<img width="1632" height="828" alt="image" src="https://github.com/user-attachments/assets/3539706a-bc02-4e00-8f84-2ebfcf002460" />

---

### 4. Account-Isolated On-Chain PnL & Deposited Tracking
- **On-Chain Event Filtering**: `Deposited` events on the smart contract are filtered strictly by `account.toLowerCase()`.
- **Zero Cross-Account Leakage**: Connecting or switching between MetaMask accounts (`Account 1`, `Account 2`, `Account 3`) isolated Deposited totals, PnL calculations, and sparkline history completely per wallet address.

---

### 5. Live Binance Price Feeds & Real-Time Price Oracles
- Continuous live price synchronization from Binance API into on-chain `MockAggregator` contracts via `updatePrices.js`.
- Interactive price chart powered by Binance WebSocket & REST Klines supporting 1m, 15m, 1h, and 1d timeframes.

<img width="1742" height="536" alt="image" src="https://github.com/user-attachments/assets/06f19b41-df50-4f63-8d15-dbf9d0ea046b" />

---

### 6. Automated Keeper Bot & One-Click Stack Launcher
- **Auto-Rebalance Keeper**: Background bot (`autoRebalanceKeeper.js`) continuously checks portfolio deviation (`checkDeviation`) and triggers automated rebalancing when drift exceeds 5%.
- **One-Click Launcher (`start-all.bat`)**: Automated batch script that launches Hardhat node, deploys smart contracts with live prices, starts the price feeder bot, starts the keeper bot, and opens the frontend dev server.

<img width="1713" height="861" alt="image" src="https://github.com/user-attachments/assets/b47d1dda-5e45-4606-a64b-7f3e4019c36c" />

---

## 🛠️ Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────┐
                     │          React + Vite Frontend           │
                     │  (Ethers.js v6, Recharts, Binance WS)    │
                     └────────────────────┬─────────────────────┘
                                          │
                                          ▼
                     ┌──────────────────────────────────────────┐
                     │         PortfolioManager Contract        │
                     │  (Non-Custodial Multi-Asset Rebalance)   │
                     └─────────┬──────────────────────┬─────────┘
                               │                      │
                               ▼                      ▼
                    ┌──────────────────────┐ ┌───────────────────┐
                    │    MockSwapRouter    │ │    PriceOracle    │
                    │ (Uniswap V3 Simulated│ │ (Chainlink Oracles│
                    └──────────────────────┘ └───────────────────┘
```

- **Smart Contracts**: Solidity `^0.8.20` (compiled with `--via-ir`), OpenZeppelin Contracts v5.
- **Development Framework**: Hardhat, Ethers.js v6.
- **Frontend Framework**: React 18, Vite, Vanilla CSS with custom glassmorphism design system.
- **Data Visualizations**: Recharts, Lightweight Charts.
- **Market Data Oracles**: Binance REST & WebSocket API, Chainlink Aggregator V3 feeds.

---

## 📂 Project Structure

```
defi-portfolio-manager/
├── contracts/               # Hardhat Smart Contracts & Deployment Scripts
│   ├── contracts/           # Solidity Contracts
│   │   ├── PortfolioManager.sol
│   │   ├── PriceOracle.sol
│   │   └── mocks/           # Mock ERC20 (WBTC, WETH, BNB, USDT...), SwapRouter, Aggregators
│   └── scripts/             # Deployment & Keeper Scripts
│       ├── deploy.js
│       ├── updatePrices.js
│       └── autoRebalanceKeeper.js
├── frontend/                # React Vite Frontend Application
│   ├── src/
│   │   ├── components/      # UI Components (Dashboard, PriceChart, RebalanceModal, etc.)
│   │   ├── config/          # Contract ABIs, Addresses, & Asset Mappings
│   │   └── hooks/           # Custom React Hooks (usePortfolio)
│   └── public/              # Static Assets & Brand Logo
├── start-all.bat            # One-Click Full Stack Launcher (Windows CMD)
├── start-all.ps1            # One-Click Full Stack Launcher (PowerShell)
└── README.md
```

---

## 🚀 Quickstart & Local Running Guide

### Option 1: One-Click Launcher (Recommended)

Simply double-click **`start-all.bat`** (or run `.\start-all.ps1` in PowerShell) from the project root. It will automatically:
1. Launch Hardhat Node on port `8545`.
2. Deploy Smart Contracts with live Binance spot prices.
3. Launch Real-time Price Feeder bot (`updatePrices.js`).
4. Launch Automated Rebalance Keeper bot (`autoRebalanceKeeper.js`).
5. Launch Frontend Dev Server on `http://localhost:5173`.

---

### Option 2: Manual Terminal Setup

#### 1. Install Dependencies
```bash
# Install smart contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 2. Start Hardhat Local Node (Terminal 1)
```bash
cd contracts
npx hardhat node
```

#### 3. Deploy Smart Contracts (Terminal 2)
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

#### 4. Start Price Feeder Bot (Terminal 3)
```bash
cd contracts
npx hardhat run scripts/updatePrices.js --network localhost
```

#### 5. Start Automated Keeper Bot (Terminal 4)
```bash
cd contracts
npx hardhat run scripts/autoRebalanceKeeper.js --network localhost
```

#### 6. Start Frontend App (Terminal 5)
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🦊 MetaMask Configuration

- **Network Name**: Hardhat Localhost
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

Import one of Hardhat's default test private keys into MetaMask to start interacting with DPM.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
