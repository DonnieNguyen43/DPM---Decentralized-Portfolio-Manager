const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const PAIRS = [
    { symbol: "BTCUSDT", key: "BTC" },
    { symbol: "ETHUSDT", key: "ETH" },
    { symbol: "SUIUSDT", key: "SUI" },
    { symbol: "NEARUSDT", key: "NEAR" },
    { symbol: "ARBUSDT", key: "ARB" },
    { symbol: "OPUSDT", key: "OP" },
    { symbol: "LINKUSDT", key: "LINK" },
    { symbol: "SOLUSDT", key: "SOL" },
    { symbol: "BNBUSDT", key: "BNB" },
];

async function fetchBinancePrices() {
    const symbols = PAIRS.map((p) => p.symbol);
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const priceMap = {};
    for (const item of data) {
        priceMap[item.symbol] = parseFloat(item.price);
    }
    return priceMap;
}

function parsePriceFeedAddresses(configRaw) {
    const sectionMatch = configRaw.match(/PRICE_FEED_ADDRESSES\s*=\s*\{([^}]+)\}/);
    if (!sectionMatch) {
        throw new Error("Could not find PRICE_FEED_ADDRESSES block in contracts.js");
    }
    const block = sectionMatch[1];
    
    const getAddr = (symbol) => {
        const m = block.match(new RegExp(`\\b${symbol}:\\s*"(0x[a-fA-F0-9]{40})"`));
        return m ? m[1] : null;
    };

    const result = {};
    for (const p of PAIRS) {
        result[p.key] = getAddr(p.key);
    }
    return result;
}

async function main() {
    const contractsConfigPath = path.resolve(__dirname, "../../frontend/src/config/contracts.js");
    const configRaw = fs.readFileSync(contractsConfigPath, "utf-8");
    const feeds = parsePriceFeedAddresses(configRaw);

    console.log("Price Feed Addresses loaded:");
    console.log(feeds);

    const signers = await hre.ethers.getSigners();
    const updaterSigner = signers[1] || signers[0];

    console.log("Price Updater Account:", updaterSigner.address);

    const mockAbi = [
        "function updateAnswer(int256 newPrice) external",
        "function setPrice(int256 newPrice) external",
        "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)"
    ];

    const feedContracts = PAIRS.map((p) => ({
        key: p.key,
        symbol: p.symbol,
        contract: new hre.ethers.Contract(feeds[p.key], mockAbi, updaterSigner),
    }));

    async function updateCycle() {
        try {
            const prices = await fetchBinancePrices();
            const timestamp = new Date().toLocaleTimeString();

            const txs = await Promise.all(
                feedContracts.map((item) => {
                    const priceNum = prices[item.symbol] || 0;
                    const priceInt = BigInt(Math.round(priceNum * 1e8));
                    return item.contract.updateAnswer(priceInt);
                })
            );

            await Promise.all(txs.map((tx) => tx.wait()));

            console.log(`[${timestamp}] Real-time Prices updated on Hardhat Local (8 Assets):`);
            feedContracts.forEach((item) => {
                const priceNum = prices[item.symbol] || 0;
                console.log(`  ${item.key.padEnd(5)}: $${priceNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`);
            });
        } catch (error) {
            console.error(`[${new Date().toLocaleTimeString()}] Price update error:`, error.message);
        }
    }

    console.log("Starting Real-Time Price Updater (interval: 5s)...");
    await updateCycle();
    setInterval(updateCycle, 5000);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
