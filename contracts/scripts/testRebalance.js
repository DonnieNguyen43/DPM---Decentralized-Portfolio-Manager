const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const pmAddress = "0x4Dd5336F3C0D70893A7a86c6aEBe9B953E87c891";
  const pm = await hre.ethers.getContractAt("PortfolioManager", pmAddress, signer);

  // Filter Deposited events to find user addresses
  const depEvents = await pm.queryFilter("Deposited", 0, "latest");
  const users = [...new Set(depEvents.map((e) => e.args[0]))];
  console.log("Found users who deposited:", users);

  for (const user of users) {
    console.log("\nTesting rebalance for user:", user);
    try {
      // Call static call to simulate rebalance without broadcasting
      await pm.executeRebalanceFor.staticCall(user);
      console.log(`Static call SUCCESS for ${user}!`);
    } catch (err) {
      console.error(`Static call FAILED for ${user}:`, err.reason || err.message || err);
    }
  }
}

main().catch(console.error);
