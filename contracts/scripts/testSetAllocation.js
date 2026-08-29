const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const contractsConfigPath = path.resolve(__dirname, "../../frontend/src/config/contracts.js");
    const configRaw = fs.readFileSync(contractsConfigPath, "utf-8");
    const m = configRaw.match(/PORTFOLIO_MANAGER_ADDRESS\s*=\s*"(0x[a-fA-F0-9]{40})"/);
    if (!m) throw new Error("No PortfolioManager address found");

    const portfolioAddress = m[1];
    console.log("Testing setTargetAllocation on:", portfolioAddress);

    const [signer] = await hre.ethers.getSigners();
    const PortfolioManager = await hre.ethers.getContractFactory("PortfolioManager");
    const pm = PortfolioManager.attach(portfolioAddress);

    console.log("Calling setTargetAllocation([2500, 2500, 2500, 2500])...");
    const tx = await pm.setTargetAllocation([2500, 2500, 2500, 2500]);
    console.log("Tx hash:", tx.hash);
    await tx.wait();
    console.log("SUCCESS! setTargetAllocation executed successfully.");

    const allocs = await pm.getTargetAllocations(signer.address);
    console.log("Stored allocations:", allocs.map(a => a.toString()));
}

main().catch((err) => {
    console.error("ERROR:", err);
    process.exitCode = 1;
});
