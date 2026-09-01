@echo off
title DPM Local Blockchain Automator
echo ========================================================
echo   DECENTRALIZED PORTFOLIO MANAGER - LOCAL NODE SETUP
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Launching Hardhat Node in background process window...
start "Hardhat Local Node (Do Not Close)" cmd /k "npx hardhat node"

echo [2/3] Waiting 5 seconds for node RPC to initialize at http://127.0.0.1:8545...
timeout /t 5 /nobreak > nul

echo [3/3] Deploying smart contracts to network 'localhost'...
echo.
npx hardhat run scripts/deploy.js --network localhost

echo.
echo ========================================================
echo   SETUP COMPLETE!
echo ========================================================
echo  - Hardhat Node: Running in separate window (http://127.0.0.1:8545)
echo  - Frontend config: Updated at frontend/src/config/contracts.js
echo.
pause
