const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const contractsConfigPath = path.resolve(__dirname, "../../frontend/src/config/contracts.js");
    const configRaw = fs.readFileSync(contractsConfigPath, "utf-8");

    const pmMatch = configRaw.match(/PORTFOLIO_MANAGER_ADDRESS\s*=\s*"(0x[a-fA-F0-9]{40})"/);
    const oracleMatch = configRaw.match(/PRICE_ORACLE_ADDRESS\s*=\s*"(0x[a-fA-F0-9]{40})"/);

    const portfolioManagerAddress = pmMatch[1];
    const priceOracleAddress = oracleMatch[1];

    const signers = await hre.ethers.getSigners();
    const userAddress = signers[0].address;

    const pmAbi = [
        "function getInvestorBalances(address user) external view returns (uint256[10])",
        "function getTargetAllocations(address user) external view returns (uint256[10])",
    ];

    const oracleAbi = [
        "function getLatestPrices() external view returns (int256[10])",
        "function checkDeviation(uint256[10] calldata balances, uint256[10] calldata targetAllocations, uint256 thresholdBps) external view returns (bool)",
    ];

    const pmContract = new hre.ethers.Contract(portfolioManagerAddress, pmAbi, signers[0]);
    const oracleContract = new hre.ethers.Contract(priceOracleAddress, oracleAbi, signers[0]);

    const balances = await pmContract.getInvestorBalances(userAddress);
    const targetAllocations = await pmContract.getTargetAllocations(userAddress);
    const prices = await oracleContract.getLatestPrices();

    const symbols = ["WBTC", "WETH", "SUI", "NEAR", "ARB", "OP", "LINK", "SOL", "BNB", "USDT"];

    let totalUsd = 0n;
    const assetUsds = [];

    for (let i = 0; i < 10; i++) {
        const bal = BigInt(balances[i]);
        const price = BigInt(prices[i]);
        const usd = (bal * price) / 100000000n;
        assetUsds.push(usd);
        totalUsd += usd;
    }

    console.log("Total Portfolio USD (wei):", totalUsd.toString(), "Formatted:", hre.ethers.formatEther(totalUsd));

    let totalAbsDriftBps = 0;

    for (let i = 0; i < 10; i++) {
        const targetBps = Number(targetAllocations[i]);
        const actualBps = totalUsd > 0n ? Number((assetUsds[i] * 10000n) / totalUsd) : 0;
        const driftBps = actualBps - targetBps;
        totalAbsDriftBps += Math.abs(driftBps);

        console.log(`${symbols[i].padStart(5)}: Bal=${hre.ethers.formatEther(balances[i])} | ValUSD=$${hre.ethers.formatEther(assetUsds[i])} | Actual=${(actualBps/100).toFixed(2)}% | Target=${(targetBps/100).toFixed(2)}% | Drift=${(driftBps/100).toFixed(2)}%`);
    }

    console.log("Total Absolute Drift %:", (totalAbsDriftBps / 100).toFixed(2) + "%");
    const balArr = Array.from(balances).map(x => x.toString());
    const targetArr = Array.from(targetAllocations).map(x => x.toString());
    const isDev500 = await oracleContract.checkDeviation(balArr, targetArr, 500);
    console.log("checkDeviation (threshold 500 BPS = 5%):", isDev500);
}

main().catch(console.error);
