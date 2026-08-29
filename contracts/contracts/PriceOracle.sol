// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/AggregatorV3Interface.sol";

contract PriceOracle {
    uint256 public constant NUM_ASSETS = 10;
    uint256 public constant NUM_FEEDS = 9;
    uint256 public constant BASIS_POINTS = 10000;

    address public immutable owner;
    AggregatorV3Interface[NUM_FEEDS] public feeds;

    constructor(address[NUM_FEEDS] memory _feeds) {
        owner = msg.sender;
        for (uint256 i = 0; i < NUM_FEEDS; i++) {
            feeds[i] = AggregatorV3Interface(_feeds[i]);
        }
    }

    function getLatestPrices() external view returns (int256[NUM_ASSETS] memory prices) {
        for (uint256 i = 0; i < NUM_FEEDS; i++) {
            (, prices[i], , , ) = feeds[i].latestRoundData();
            require(prices[i] > 0, "INVALID_PRICE");
        }
        prices[9] = 100000000; // USDT fixed price = $1.00 USD (8 decimals)
    }

    function checkDeviation(
        uint256[NUM_ASSETS] calldata balances,
        uint256[NUM_ASSETS] calldata targetAllocations,
        uint256 thresholdBps
    ) external view returns (bool) {
        int256[NUM_ASSETS] memory prices = this.getLatestPrices();

        uint256 totalValueUsd;
        uint256[NUM_ASSETS] memory assetValuesUsd;

        for (uint256 i; i < NUM_ASSETS; ++i) {
            assetValuesUsd[i] = (balances[i] * uint256(prices[i])) / 1e8;
            totalValueUsd += assetValuesUsd[i];
        }

        if (totalValueUsd == 0) return false;

        for (uint256 i; i < NUM_ASSETS; ++i) {
            uint256 actualBps = (assetValuesUsd[i] * BASIS_POINTS) / totalValueUsd;
            uint256 targetBps = targetAllocations[i];

            uint256 deviation = actualBps > targetBps
                ? actualBps - targetBps
                : targetBps - actualBps;

            if (deviation > thresholdBps) return true;
        }

        return false;
    }
}
