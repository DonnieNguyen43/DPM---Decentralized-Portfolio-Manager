const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const contractsConfigPath = path.resolve(__dirname, "../../frontend/src/config/contracts.js");
    const configRaw = fs.readFileSync(contractsConfigPath, "utf-8");

    const pmMatch = configRaw.match(/PORTFOLIO_MANAGER_ADDRESS\s*=\s*"(0x[a-fA-F0-9]{40})"/);
    const oracleMatch = configRaw.match(/PRICE_ORACLE_ADDRESS\s*=\s*"(0x[a-fA-F0-9]{40})"/);

    if (!pmMatch || !oracleMatch) {
        throw new Error("Could not parse contract addresses from contracts.js");
    }

    const portfolioManagerAddress = pmMatch[1];
    const priceOracleAddress = oracleMatch[1];

    const signers = await hre.ethers.getSigners();
    // Use Account 2 as the Automated Keeper Bot
    const keeperSigner = signers[2] || signers[0];
    const userAddress = signers[0].address; // Monitor user Account 0

    console.log("==================================================");
    console.log("  DEFI AUTOMATED REBALANCE KEEPER BOT (10 ASSETS)");
    console.log("  Keeper Account:", keeperSigner.address);
    console.log("  Monitoring User:", userAddress);
    console.log("  PortfolioManager:", portfolioManagerAddress);
    console.log("==================================================");

    const pmAbi = [
        "function getInvestorBalances(address user) external view returns (uint256[10])",
        "function getTargetAllocations(address user) external view returns (uint256[10])",
        "function executeRebalanceFor(address user) external",
    ];

    const oracleAbi = [
        "function checkDeviation(uint256[10] calldata balances, uint256[10] calldata targetAllocations, uint256 thresholdBps) external view returns (bool)",
    ];

    const pmContract = new hre.ethers.Contract(portfolioManagerAddress, pmAbi, keeperSigner);
    const oracleContract = new hre.ethers.Contract(priceOracleAddress, oracleAbi, keeperSigner);

    async function keeperCycle() {
        try {
            const timestamp = new Date().toLocaleTimeString();
            const rawBalances = await pmContract.getInvestorBalances(userAddress);
            const rawAllocations = await pmContract.getTargetAllocations(userAddress);

            const balances = Array.from(rawBalances).map((b) => b.toString());
            const targetAllocations = Array.from(rawAllocations).map((a) => a.toString());

            // Check if user has active target allocation
            const hasAllocations = targetAllocations.some((a) => BigInt(a) > 0n);
            if (!hasAllocations) {
                console.log(`[${timestamp}] [KEEPER] User ${userAddress.slice(0, 6)}... has no active target allocation set.`);
                return;
            }

            // Threshold: 500 bps = 5% deviation
            const isDeviated = await oracleContract.checkDeviation(balances, targetAllocations, 500);

            if (isDeviated) {
                console.log(`\n[${timestamp}] ⚠️ [KEEPER BOT] Allocation deviation > 5% detected on-chain!`);
                console.log(`[${timestamp}] 🚀 [KEEPER BOT] Executing Automated Rebalance for investor ${userAddress.slice(0, 6)}...`);
                const tx = await pmContract.executeRebalanceFor(userAddress);
                console.log(`[${timestamp}] ⏳ Transaction submitted: ${tx.hash}`);
                await tx.wait();
                console.log(`[${timestamp}] ✅ [KEEPER BOT] Automated Rebalance successfully completed on-chain!\n`);
            } else {
                console.log(`[${timestamp}] [KEEPER] Portfolio allocation within threshold. No rebalance needed.`);
            }
        } catch (err) {
            console.error(`[${new Date().toLocaleTimeString()}] [KEEPER ERROR]:`, err.message);
        }
    }

    console.log("Keeper Bot active (polling every 8 seconds)...");
    await keeperCycle();
    setInterval(keeperCycle, 8000);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
