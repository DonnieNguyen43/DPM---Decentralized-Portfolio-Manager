# DPM Local Blockchain Automator (PowerShell)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DECENTRALIZED PORTFOLIO MANAGER - LOCAL NODE SETUP" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] Launching Hardhat Node in background window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npx hardhat node"

Write-Host "[2/3] Waiting 5 seconds for node RPC to initialize at http://127.0.0.1:8545..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "[3/3] Deploying smart contracts to network 'localhost'..." -ForegroundColor Yellow
Write-Host ""
npx hardhat run scripts/deploy.js --network localhost

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host " - Hardhat Node: Running in separate window (http://127.0.0.1:8545)"
Write-Host " - Frontend config: Updated at frontend/src/config/contracts.js"
Write-Host ""
