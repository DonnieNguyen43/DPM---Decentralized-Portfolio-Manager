# 🚀 DPM — Decentralized Portfolio Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636.svg?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22.0-yellow.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF.svg?logo=vite)](https://vitejs.js.org/)

**Decentralized Portfolio Manager (DPM)** is a state-of-the-art non-custodial Web3 protocol designed for automated multi-asset portfolio management, risk monitoring, real-time allocation drift tracking, and 2-step review rebalancing.

---

<img width="1841" height="698" alt="image" src="https://github.com/user-attachments/assets/51fa2b89-c4eb-4dd0-aec7-a05395aea009" />


---

## ✨ Core Features

1. **⚡ USDT Single-Asset Zap-in & Multi-Asset Deposits**:
   - Single-click deposit using **USDT** (zap-in) or direct deposits for 9 crypto assets (`WBTC`, `WETH`, `SUI`, `NEAR`, `ARB`, `OP`, `LINK`, `SOL`,`BNB`).

<img width="1775" height="727" alt="image" src="https://github.com/user-attachments/assets/a07d351c-d25c-4349-930b-ea6360e44480" />


2. **📊 Real-time Allocation Drift & Risk Monitoring Table**:
   - Live calculation of **Drift (%) = Actual (%) - Target (%)**.
   - Automatic risk categorization: `BALANCED`, `OVERWEIGHT` (+0.5%), and `UNDERWEIGHT` (-0.5%).
   - Total Absolute Drift metric calculation.

<img width="1702" height="607" alt="image" src="https://github.com/user-attachments/assets/bbb700e1-308c-4412-9738-9b52474b6b1a" />


3. **🔄 2-Step Rebalance Review Modal**:
   - Simulated execution plan table prior to executing on-chain transactions.
   - Shows detailed sell/buy token routes, estimated output, USD value, gas estimation, and slippage tolerance.
   - Interactive **Before vs After** allocation preview.

<img width="1632" height="828" alt="image" src="https://github.com/user-attachments/assets/3539706a-bc02-4e00-8f84-2ebfcf002460" />


4. **⚡ Smart Range Sliders & Auto Equal Weight**:
   - Real-time range sliders (0-100%) with a 100% total progress bar.
   - `⚡ Equal Weight` button for instant equal percentage distribution.
   - Target sliders automatically persist and load current contract target allocations without unwanted auto-resets.

5. **📈 Interactive Price Charts & Sparklines**:
   - Candlestick price chart with 1m, 15m, 1h, and 1d timeframes powered by live Binance WebSocket & REST Klines.
   - Real-time Portfolio Value Sparkline chart reflecting 24h PnL trends.

<img width="1742" height="536" alt="image" src="https://github.com/user-attachments/assets/06f19b41-df50-4f63-8d15-dbf9d0ea046b" />


6. **📜 Transaction History & Grouped Accordions**:
   - Grouped swap log accordion displaying all past rebalancing batches with transaction hashes and status badges.

<img width="1713" height="861" alt="image" src="https://github.com/user-attachments/assets/b47d1dda-5e45-4606-a64b-7f3e4019c36c" />


---

## 🛠️ Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────┐
                     │          React + Vite Frontend           │
                     │  (ethers.js, Recharts, Binance WebSockets│
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

- **Smart Contracts**: Solidity `^0.8.20`, OpenZeppelin Contracts v5.
- **Development Framework**: Hardhat, Ethers.js v6.
- **Frontend UI/UX**: React 18, Vite, Vanilla CSS with custom glassmorphism design system.
- **Data Visualizations**: Recharts, Lightweight Charts.
- **Market Data Feeds**: Binance API (REST & WebSockets), Chainlink Aggregator V3 feeds.

---

## 📂 Project Structure

```
defi-portfolio-manager/
├── contracts/               # Hardhat Smart Contracts & Deployment Scripts
│   ├── contracts/           # Solidity Contracts
│   │   ├── PortfolioManager.sol
│   │   ├── PriceOracle.sol
│   │   └── mocks/           # Mock ERC20, SwapRouter, Aggregator
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
└── README.md
```

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js `v18.x` or later
- npm or pnpm
- MetaMask extension installed in browser

### 2. Install Dependencies

```bash
# Install root contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Run Local Blockchain & Deploy Contracts

Open Terminal 1 (Start Hardhat Node):
```bash
cd contracts
npx hardhat node
```

Open Terminal 2 (Deploy Contracts):
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Start Real-time Price Feeder (Binance Live Prices)

Open Terminal 3 (Price Oracle Feeder):
```bash
cd contracts
npx hardhat run scripts/updatePrices.js --network localhost
```

### 5. Start Frontend Application

Open Terminal 4 (Vite Dev Server):
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` in your browser.

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
