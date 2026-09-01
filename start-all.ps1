# DPM Full Stack One-Click Launcher (PowerShell)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DECENTRALIZED PORTFOLIO MANAGER - ONE-CLICK LAUNCHER" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = $PSScriptRoot

Write-Host "[1/5] Launching Hardhat Blockchain Node in background window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir\contracts'; npx hardhat node"

Write-Host "[2/5] Waiting 5 seconds for local node RPC initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "[3/5] Deploying Smart Contracts to network 'localhost'..." -ForegroundColor Yellow
Write-Host ""
Set-Location "$RootDir\contracts"
npx hardhat run scripts/deploy.js --network localhost

Write-Host ""
Write-Host "[4/5] Launching Automated Rebalance Keeper Bot (Monitoring 5% Deviation)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir\contracts'; npx hardhat run scripts/autoRebalanceKeeper.js --network localhost"

Write-Host ""
Write-Host "[5/5] Launching Frontend Dev Server on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir\frontend'; npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ALL SYSTEMS GO!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host " - Hardhat Node:  http://127.0.0.1:8545 (Running)"
Write-Host " - Keeper Bot:    Active (Monitoring >5% Deviation)"
Write-Host " - Frontend App:  http://localhost:5173 (Auto-Opening)"
Write-Host " - Admin Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
