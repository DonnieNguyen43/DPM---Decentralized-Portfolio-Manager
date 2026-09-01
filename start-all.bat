@echo off
title DPM Full Stack One-Click Launcher
echo ========================================================
echo   DECENTRALIZED PORTFOLIO MANAGER - ONE-CLICK LAUNCHER
echo ========================================================
echo.

:: Ensure working directory is project root
cd /d "%~dp0"

echo [1/6] Launching Hardhat Blockchain Node in new window...
start "Hardhat Local Node (Port 8545)" cmd /k "cd /d "%~dp0contracts" && npx hardhat node"

echo [2/6] Waiting 5 seconds for local node RPC initialization...
timeout /t 5 /nobreak > nul

echo [3/6] Deploying Smart Contracts with Live Binance Prices...
echo.
cd /d "%~dp0contracts"
call npx hardhat run scripts/deploy.js --network localhost

echo.
echo [4/6] Launching Real-time Price Feeder (Binance -> Oracle Feeds)...
start "DPM Price Oracle Feeder" cmd /k "cd /d "%~dp0contracts" && npx hardhat run scripts/updatePrices.js --network localhost"

echo.
echo [5/6] Launching Automated Rebalance Keeper Bot (Monitoring 5%% Deviation)...
start "DPM Keeper Bot (Auto-Rebalance)" cmd /k "cd /d "%~dp0contracts" && npx hardhat run scripts/autoRebalanceKeeper.js --network localhost"

echo.
echo [6/6] Launching Frontend Dev Server on port 5173...
start "DPM Frontend Dev Server (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   ALL SYSTEMS GO!
echo ========================================================
echo  - Hardhat Node:  http://127.0.0.1:8545 (Running)
echo  - Price Feeder:  Active (Updating Oracle Feeds)
echo  - Keeper Bot:    Active (Monitoring >5%% Deviation)
echo  - Frontend App:  http://localhost:5173
echo ========================================================
echo.
pause
