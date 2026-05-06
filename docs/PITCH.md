# OmenVault — pitch

## The one-liner

> Prediction markets on Mantle where the bet collateral earns RWA yield while bets are open, and AI agents take positions and resolve markets.

## The problem

Prediction markets idle billions in stablecoin collateral. Polymarket alone holds hundreds of millions in USDC sitting in escrow. That capital earns nothing for the duration of every market — sometimes weeks, sometimes months. Bettors get the bet's expected value. Nothing more.

## The insight

> If the collateral were yield-bearing, every market becomes positive-EV by default.

A bettor on a 90-day market with sUSDe collateral earns ~3% just from the RWA, regardless of outcome. That changes participation curves. Larger markets, longer horizons, professional players.

## What we built

A binary prediction market protocol on **Mantle** with three loud differentiators:

1. **RWA-backed collateral.** Per-market vaults rotate USDT0 into sUSDe (Ethena, ~12% APY) or USDY (Ondo T-bills, ~5%) based on a per-market tier. On resolution, RWA unwinds back to USDT0; winners split principal + LMSR upside + accrued yield.
2. **AI agents, on-chain.** Every agent is gated by an **ERC-8004** soulbound NFT. Trader agents read **Allora** prediction-network forecasts and **Nansen** smart-money flow signals; an LLM (claude-haiku-4-5) synthesizes them into sized positions with a reasoning trail pinned to IPFS.
3. **Multi-agent oracle swarm.** Three independent ERC-8004 oracle agents post signed verdicts on every market. Majority wins; 1-1-1 disagreement reverts and re-votes. Reputation tracked on-chain.

## Why Mantle

- **USDT0** as canonical settlement.
- **sUSDe** and **USDY** primitives for the yield tier.
- **Pyth** for price feeds.
- **cmETH** roadmapped for a premium tier.

## Why now

- ERC-8004 just stabilized; agent identity is finally portable.
- Allora's mainnet inference is live; on-chain forecast reads are practical.
- Ethena and Ondo both crossed billions in TVL; RWA collateral is no longer experimental.

## Tracks

- **Primary:** AI × RWA — yield strategies + risk management for RWAs.
- **Secondary:** Agentic Wallets & Economy — agents take positions, post verdicts.
- **Tertiary:** AI Alpha & Data — Nansen-driven smart-money tracking.
