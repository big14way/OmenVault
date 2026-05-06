# OmenVault — Architecture

## Overview

OmenVault is a binary prediction-market protocol on Mantle Sepolia. The core insight:

> **Settlement collateral earns RWA yield while bets are open.**

Bettors deposit USDT0; per-market vaults rotate that collateral into sUSDe (Ethena, ~12% APY) or USDY (Ondo T-bills, ~5% APY) for the duration of the market. When the market resolves, the RWA position is unwound and winners receive principal + LMSR upside + a pro-rata share of the yield earned.

## On-chain components

```
┌──────────────────┐     ┌──────────────────┐
│  AgentRegistry   │ <── │  MarketFactory   │
│  (ERC-8004 SBT)  │     └────────┬─────────┘
└──────────────────┘              │ creates
        ▲                          ▼
        │                   ┌──────────────┐    ┌──────────────────┐
        │                   │   Market     │ ── │ CollateralVault  │
        │                   │  (LMSR)      │    │  (USDT0 ⇄ RWA)   │
        │                   └──────┬───────┘    └──────────────────┘
        │                          │ resolve()
        │ adjustReputation         │
        │                   ┌──────┴───────┐
        └─────────────────  │ OracleSwarm  │
                            │ (3-of-3 SBT) │
                            └──────┬───────┘
                                   │ reads
                            ┌──────┴────────┐
                            │ AlloraConsumer│
                            └───────────────┘

  All decisions append to DecisionLog (audit stream).
```

| Contract | Lines (target) | Owner | Notes |
|---|---|---|---|
| AgentRegistry | ~200 | Lead | ERC-8004 soulbound NFT. Tracks reputation. |
| MarketFactory | ~160 | Lead | Permissionless market creation. |
| Market | ~400 | Lead + Senior | LMSR pricing, position state, resolve hook. |
| CollateralVault | ~250 | Lead | Per-market USDT0 ⇄ sUSDe/USDY rotation. |
| OracleSwarm | ~240 | Senior | Three-agent resolution; majority wins; tie reverts. |
| AlloraConsumer | ~120 | Senior | Reads + verifies Allora forecasts. |
| DecisionLog | ~100 | Lead | Append-only event stream. |

### LMSR pricing

Logarithmic Market Scoring Rule, judge-friendly and proven. Prices for outcome i:

`p_i = exp(q_i / b) / Σ exp(q_j / b)`

Where `q_i` is shares minted on outcome i and `b` is the liquidity parameter. Cost to buy `Δq` shares is `C(q + Δq) - C(q)` where `C(q) = b · ln(Σ exp(q_j / b))`.

### Collateral tiers

| Tier | RWA | APY |
|---|---|---|
| 0 | USDT0 only (no rotation) | 0% |
| 1 | USDY (Ondo T-bills) | ~5% |
| 2 | sUSDe (Ethena synthetic dollar) | ~12% |

The vault is single-tenant per market. Conversion happens on enter; unwind happens on resolution.

### Oracle swarm

Three independent ERC-8004 oracle agents post signed votes. Outcomes are `{YES, NO, INVALID}`. Each oracle uses different data sources for redundancy. Resolution rules:

- **3-0 / 2-1**: Majority wins. Reputation adjusts +1 / -1.
- **1-1-1**: `finalize()` reverts. Swarm must re-vote. (Possible escalation: human admin override — out of scope for v1.)

## Off-chain components — see [bots/README per package](../bots/)

| Bot | Purpose | Owner |
|---|---|---|
| `bots/trader` | LLM-driven position sizing. Reads Allora + Nansen + market price. | Lead |
| `bots/oracle-swarm` | Three independent processes that resolve markets. | Senior |
| `bots/nansen-watcher` | Polls Nansen smart-money flow; serves cached signals locally. | Lead |
| `bots/shared` | Shared TS utilities (env, RPC, IPFS pinning). | — |
| `bots/byreal-skills` | Six skill manifests covering the lifecycle. | Lead |

## Frontend — Next.js 15 (App Router)

Owner: frontend team. See [apps/web/README.md](../apps/web/README.md). Critical components:

- `MarketCard` — list cell on `/markets`
- `OutcomeBar` — animated YES/NO LMSR price
- `PositionForm` — enter with USDT0, collateral tier picker
- `AgentReasoningCard` — the headline AI surface
- `OracleSwarmPanel` — three-card live resolution
- `YieldBar` — RWA yield ticker
- `DecisionStream` — real-time event feed

## Data flow on a typical bet

1. User creates market via `MarketFactory.createMarket(params)`.
2. Bettor approves USDT0 → `Market.enter(side, amount)`.
3. Market pulls USDT0 → `CollateralVault.acceptDeposit(amount)`.
4. Vault rotates: tier 1 → mint USDY; tier 2 → deposit USDe → stake sUSDe.
5. LMSR mints shares to bettor; price updates.
6. Yield accrues silently while market is open. `vaultValue()` grows.
7. On `resolutionAt`, oracle swarm fetches data (3 sources), votes (3 signed txs).
8. Anyone calls `OracleSwarm.finalize(market)` → computes majority → `Market.resolve(outcome)`.
9. Winners call `Market.claim()` → vault unwinds RWA → pays principal + upside + yield share.
10. Every step emits a `Decision` event in `DecisionLog`.

## Deployment

| Environment | Chain | Status |
|---|---|---|
| Local | Foundry / Anvil | Working — `forge test` |
| Sepolia | Mantle Sepolia (chain id 5003) | Pending — see `script/Deploy.s.sol` |

## Open questions / v2

- Allora "binary outcome probability" topic — proposed, not yet on Allora's roadmap. v1 uses existing topic 14 (ETH/USD) as a stand-in.
- cmETH as a premium-tier collateral (tier 3).
- Caladan as a counterparty market-maker on the LP side.
- Human admin override on 1-1-1 oracle disagreement.
