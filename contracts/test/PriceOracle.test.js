const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle", function () {
  let oracle;
  let mockBtcFeed, mockEthFeed, mockSuiFeed, mockNearFeed;
  let owner;

  const BTC_PRICE = 9500000000000n;
  const ETH_PRICE = 350000000000n;
  const SUI_PRICE = 150000000n;
  const NEAR_PRICE = 450000000n;

  async function deployMockAggregator(price) {
    const Mock = await ethers.getContractFactory("MockAggregator");
    return Mock.deploy(price);
  }

  before(async function () {
    [owner] = await ethers.getSigners();

    const MockFactory = await ethers.getContractFactory("MockAggregator");
    mockBtcFeed = await MockFactory.deploy(BTC_PRICE);
    mockEthFeed = await MockFactory.deploy(ETH_PRICE);
    mockSuiFeed = await MockFactory.deploy(SUI_PRICE);
    mockNearFeed = await MockFactory.deploy(NEAR_PRICE);

    await Promise.all([
      mockBtcFeed.waitForDeployment(),
      mockEthFeed.waitForDeployment(),
      mockSuiFeed.waitForDeployment(),
      mockNearFeed.waitForDeployment(),
    ]);

    const OracleFactory = await ethers.getContractFactory("PriceOracle");
    oracle = await OracleFactory.deploy(
      await mockBtcFeed.getAddress(),
      await mockEthFeed.getAddress(),
      await mockSuiFeed.getAddress(),
      await mockNearFeed.getAddress()
    );
    await oracle.waitForDeployment();
  });

  describe("getLatestPrices", function () {
    it("should return 4 prices matching mock values", async function () {
      const prices = await oracle.getLatestPrices();

      expect(prices.length).to.equal(4);
      expect(prices[0]).to.equal(BTC_PRICE);
      expect(prices[1]).to.equal(ETH_PRICE);
      expect(prices[2]).to.equal(SUI_PRICE);
      expect(prices[3]).to.equal(NEAR_PRICE);
    });

    it("should revert when a feed returns zero price", async function () {
      const MockFactory = await ethers.getContractFactory("MockAggregator");
      const zeroFeed = await MockFactory.deploy(0n);
      await zeroFeed.waitForDeployment();

      const OracleFactory = await ethers.getContractFactory("PriceOracle");
      const badOracle = await OracleFactory.deploy(
        await zeroFeed.getAddress(),
        await mockEthFeed.getAddress(),
        await mockSuiFeed.getAddress(),
        await mockNearFeed.getAddress()
      );
      await badOracle.waitForDeployment();

      await expect(badOracle.getLatestPrices()).to.be.revertedWith(
        "INVALID_PRICE"
      );
    });
  });

  describe("checkDeviation", function () {
    it("should return false when allocation matches target exactly", async function () {
      const btcBalance = ethers.parseUnits("1", 8);
      const ethBalance = ethers.parseUnits("10", 18);
      const suiBalance = ethers.parseUnits("1000", 9);
      const nearBalance = ethers.parseUnits("500", 18);

      const btcVal = (btcBalance * BTC_PRICE) / BigInt(1e8);
      const ethVal = (ethBalance * ETH_PRICE) / BigInt(1e8);
      const suiVal = (suiBalance * SUI_PRICE) / BigInt(1e8);
      const nearVal = (nearBalance * NEAR_PRICE) / BigInt(1e8);
      const total = btcVal + ethVal + suiVal + nearVal;

      const btcBps = (btcVal * 10000n) / total;
      const ethBps = (ethVal * 10000n) / total;
      const suiBps = (suiVal * 10000n) / total;
      const nearBps = 10000n - btcBps - ethBps - suiBps;

      const result = await oracle.checkDeviation(
        [btcBalance, ethBalance, suiBalance, nearBalance],
        [btcBps, ethBps, suiBps, nearBps],
        100n
      );

      expect(result).to.equal(false);
    });

    it("should return true when deviation exceeds threshold", async function () {
      const btcBalance = ethers.parseUnits("10", 8);
      const ethBalance = ethers.parseUnits("1", 18);
      const suiBalance = ethers.parseUnits("100", 9);
      const nearBalance = ethers.parseUnits("50", 18);

      const result = await oracle.checkDeviation(
        [btcBalance, ethBalance, suiBalance, nearBalance],
        [2500n, 2500n, 2500n, 2500n],
        100n
      );

      expect(result).to.equal(true);
    });

    it("should return false for empty portfolio", async function () {
      const result = await oracle.checkDeviation(
        [0n, 0n, 0n, 0n],
        [2500n, 2500n, 2500n, 2500n],
        100n
      );

      expect(result).to.equal(false);
    });

    it("should return false when deviation is within threshold", async function () {
      const btcBalance = ethers.parseUnits("1", 8);
      const ethBalance = ethers.parseUnits("10", 18);
      const suiBalance = ethers.parseUnits("1000", 9);
      const nearBalance = ethers.parseUnits("500", 18);

      const btcVal = (btcBalance * BTC_PRICE) / BigInt(1e8);
      const ethVal = (ethBalance * ETH_PRICE) / BigInt(1e8);
      const suiVal = (suiBalance * SUI_PRICE) / BigInt(1e8);
      const nearVal = (nearBalance * NEAR_PRICE) / BigInt(1e8);
      const total = btcVal + ethVal + suiVal + nearVal;

      const btcBps = (btcVal * 10000n) / total;
      const ethBps = (ethVal * 10000n) / total;
      const suiBps = (suiVal * 10000n) / total;
      const nearBps = 10000n - btcBps - ethBps - suiBps;

      const result = await oracle.checkDeviation(
        [btcBalance, ethBalance, suiBalance, nearBalance],
        [btcBps, ethBps, suiBps, nearBps],
        5000n
      );

      expect(result).to.equal(false);
    });
  });
});
