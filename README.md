# OmenVault

> **Prediction markets on Mantle where bettor collateral earns RWA yield while bets are open, and AI agents (gated by ERC-8004 soulbound identity) both take positions and resolve outcomes.**

[![Demo video](https://img.shields.io/badge/Demo-YouTube-FF0000?logo=youtube&logoColor=white)](https://youtu.be/tSnD3tq9oSw)
[![Live app](https://img.shields.io/badge/Live-omenvault.vercel.app-000000?logo=vercel&logoColor=white)](https://omenvault.vercel.app)
[![Mantle Mainnet](https://img.shields.io/badge/Mantle_Mainnet-deployed-000000)](https://mantlescan.xyz/address/0x0e26f1B03513DF3cEeC4617F7D0946E243b4F514)
[![Mantle Sepolia](https://img.shields.io/badge/Mantle_Sepolia-deployed-1B5E3F)](https://sepolia.mantlescan.xyz/address/0x3C343AD077983371b29fee386bdBC8a92E934C51)
[![Tests](https://img.shields.io/badge/tests-33%20passing-1B5E3F)](apps/contracts/test/)

🎬 **2:45 walkthrough**: [youtu.be/tSnD3tq9oSw](https://youtu.be/tSnD3tq9oSw) · 🌐 **Live app**: [omenvault.vercel.app](https://omenvault.vercel.app) · 📦 **Source**: this repo

Built for **The Turing Test Hackathon 2026** (Mantle, [DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026)). Tracks: **AI × RWA** (primary, sponsored by Mantle), **Agentic Economy** (secondary, sponsored by Byreal), Grand Champion + Best UI/UX + Community Voting cross-prizes.

---

## Verify in 30 seconds

If you only have a minute, these four links prove the protocol is real and live.

| What | Where | What you'll see |
|---|---|---|
| **The mainnet factory** | [`0x0e26f1...4F514` on Mantlescan](https://mantlescan.xyz/address/0x0e26f1B03513DF3cEeC4617F7D0946E243b4F514) | Verified source code, real USDT0 wired in, deployed 2026-05-25. |
| **The live app** | [omenvault.vercel.app](https://omenvault.vercel.app) | Wallet-connected Next.js UI, live Allora forecasts on-chain, live Nansen netflow. |
| **The 2:45 demo video** | [youtu.be/tSnD3tq9oSw](https://youtu.be/tSnD3tq9oSw) | Full end-to-end walkthrough: create market, AI trader enters, oracle swarm resolves, claim. |
| **The on-chain proof** | [`Entered` event tx on Sepolia](https://explorer.sepolia.mantle.xyz/tx/0xf2a672ae092143354b9d28830ecda83f2b3c1c2ca3700ee2404cf3ebb42c9c9b) | A real AI trader (ERC-8004 token #6) read Allora + Nansen + LMSR price and entered 888.72 YES shares on a market. Reasoning is pinned to IPFS, hash logged in `DecisionLog`. |

---

## The problem

Every prediction market on every chain has the same dead-money problem.

- **Polymarket** holds hundreds of millions of USDC in escrow. It earns nothing for the lifetime of every market, sometimes days, often months.
- **Augur, Azuro, Limitless, Hubble**: same story. Stablecoin collateral sits idle from entry to resolution.
- **For long-horizon markets** (election cycles, regulatory outcomes, 6-month price targets) the opportunity cost is brutal: a 90-day market at 5% RWA yield silently burns ~1.25% of bettor capital that should belong to them.

The result: short-term, hype-driven markets dominate. Long-horizon, capital-efficient markets, the kind institutions would actually price, never form because the carry cost is too high.

## The solution

OmenVault treats the bet collateral as a yield-bearing asset for the entire lifetime of the market.

1. Bettors deposit **USDT0**.
2. Per-market `CollateralVault` rotates the deposit into **sUSDe** (Ethena, ~12% APY) or **USDY** (Ondo T-bills, ~5% APY) based on a per-market tier.
3. Yield accrues silently. A `YieldBar` on every market UI shows it live.
4. On resolution, the RWA position unwinds back to USDT0. **Winners receive principal, LMSR upside, and a pro-rata share of accrued yield.**
5. AI agents (gated by **ERC-8004** soulbound identity NFTs) take positions via the Trader and resolve outcomes via a 3-agent Oracle Swarm. Every decision is pinned to IPFS and the hash is emitted on-chain.

**Why this only works on Mantle:** sUSDe, USDY, USDT0, and Pyth are all native primitives here. On Arc, Cronos, SKALE, Base, or Arbitrum at least one leg is missing or wrapped, and the composition breaks. OmenVault is a Mantle-native protocol, not a Mantle deployment of a chain-agnostic idea.

## Why this wins the hackathon

| Judge concern | How we answer it |
|---|---|
| "Is the AI surface material or cosmetic?" | The LLM reads **three external signals** (Allora forecast, Nansen smart-money flow, market price) and writes a sized position with a reasoning trail pinned to IPFS. Streaming typewriter on UI. Not a hardcoded heuristic. |
| "Does it actually use Mantle?" | USDT0 settlement, sUSDe high-yield tier, USDY conservative tier, Pyth price feed, cmETH on v2 roadmap. **Four** native primitives in one transaction. |
| "Is the RWA leg real?" | sUSDe via ERC-4626 share-price growth (~12% APY). USDY via 18-dec price-accruing token (~5% APY). Mocks mirror mainnet surface exactly. Production swap is a one-line constructor change. |
| "Is the agent identity real?" | Every agent is an **ERC-8004 soulbound ERC-721**. Reputation updates on-chain after every oracle vote. Transfer attempts revert. |
| "Is there a real partner integration story?" | Allora (forecast → on-chain `AlloraConsumer` + trader REST), Nansen (smart-money flow gates entry timing), Pinata (IPFS pinning), 6 published Byreal skills covering the full market lifecycle. |
| "Is it actually live?" | Yes. See deployed addresses below. CI green (33 tests pass). Full demo runs end-to-end with `pnpm demo`. The trader has already entered a market on chain: [tx 0xf2a672ae...](https://explorer.sepolia.mantle.xyz/tx/0xf2a672ae092143354b9d28830ecda83f2b3c1c2ca3700ee2404cf3ebb42c9c9b). |

---

## Live on Mantle mainnet (chain id 5000)

Deployer: [`0x53f51695A60C32537147DBf236ABEDC9B996C1D2`](https://mantlescan.xyz/address/0x53f51695A60C32537147DBf236ABEDC9B996C1D2), deployed 2026-05-25. All contracts verified on Mantlescan.

| Contract | Address |
|---|---|
| **MarketFactory** | [`0x0e26f1B03513DF3cEeC4617F7D0946E243b4F514`](https://mantlescan.xyz/address/0x0e26f1B03513DF3cEeC4617F7D0946E243b4F514) |
| AgentRegistry | [`0x698Be1FAdB843168952c71A369be997E804fe29F`](https://mantlescan.xyz/address/0x698Be1FAdB843168952c71A369be997E804fe29F) |
| OracleSwarm | [`0x8c07bD54577b2af4bF86923f13613b91d69eE5bf`](https://mantlescan.xyz/address/0x8c07bD54577b2af4bF86923f13613b91d69eE5bf) |
| AlloraConsumer | [`0xfa9F66226D42aBd9d69089Fb9cacF7B9F0d1856F`](https://mantlescan.xyz/address/0xfa9F66226D42aBd9d69089Fb9cacF7B9F0d1856F) |
| DecisionLog | [`0x04Dcf6c4d8cCBAac1eC9db4cf39b3a3D55cd0680`](https://mantlescan.xyz/address/0x04Dcf6c4d8cCBAac1eC9db4cf39b3a3D55cd0680) |
| USDT0 (real, Mantle native) | [`0x779Ded0c9e1022225f8E0630b35a9b54bE713736`](https://mantlescan.xyz/address/0x779Ded0c9e1022225f8E0630b35a9b54bE713736) |
| MockSUSDe | [`0xCb5B0098e9FF1377a639aD25FF59D00Ed3495c94`](https://mantlescan.xyz/address/0xCb5B0098e9FF1377a639aD25FF59D00Ed3495c94) |
| MockUSDY | [`0x888D23980F22f0647923e0379F2b451389988ade`](https://mantlescan.xyz/address/0x888D23980F22f0647923e0379F2b451389988ade) |

### Why real USDT0 plus mocks for sUSDe and USDY on mainnet?

USDT0 is the only one of the three with a canonical Mantle mainnet deployment, so the protocol settles in real USDT0. sUSDe is not natively on Mantle mainnet (Ethena's sUSDe lives on Ethereum and only reaches Mantle through bridges), and USDY is KYC-gated by Ondo, which would block our bot and bettor wallets without a multi-week whitelisting process. For the hackathon window we ship clearly-labeled `MockSUSDe` and `MockUSDY` for the yield tiers, both of which mirror the mainnet share-price growth surface (sUSDe is ERC-4626 at ~12% APY, USDY is 18-dec price-accruing at ~5% APY). Swapping in real Ethena and Ondo deployments is a one-line constructor change when those primitives become available natively on Mantle.

## Live on Mantle Sepolia (chain id 5003)

Deployer: [`0x3C343AD077983371b29fee386bdBC8a92E934C51`](https://sepolia.mantlescan.xyz/address/0x3C343AD077983371b29fee386bdBC8a92E934C51), deployed 2026-05-12

| Contract | Address |
|---|---|
| MarketFactory | [`0xf22f7671529aecfebdca582dc48693b7ad94c1b2`](https://sepolia.mantlescan.xyz/address/0xf22f7671529aecfebdca582dc48693b7ad94c1b2) |
| AgentRegistry | [`0x4b6ca7769568f154f3d1bb274d20f5ef9ded3a76`](https://sepolia.mantlescan.xyz/address/0x4b6ca7769568f154f3d1bb274d20f5ef9ded3a76) |
| OracleSwarm | [`0x58c9bb07859967be7d10e36a3a329a496f5f9a1e`](https://sepolia.mantlescan.xyz/address/0x58c9bb07859967be7d10e36a3a329a496f5f9a1e) |
| AlloraConsumer | [`0xf2d15ca4d4d6c427d304ab78b6806ac90435727f`](https://sepolia.mantlescan.xyz/address/0xf2d15ca4d4d6c427d304ab78b6806ac90435727f) |
| DecisionLog | [`0xf63fbf2279a7c4b7049692441ff0a0f5cde75689`](https://sepolia.mantlescan.xyz/address/0xf63fbf2279a7c4b7049692441ff0a0f5cde75689) |
| MockUSDT0 | [`0xcf0e14b2a482bbedb2edadc8c4814dcfd712857b`](https://sepolia.mantlescan.xyz/address/0xcf0e14b2a482bbedb2edadc8c4814dcfd712857b) |
| MockSUSDe | [`0x85cf3d6f3d3ef680718cb53b2b6d4b51b341b2a0`](https://sepolia.mantlescan.xyz/address/0x85cf3d6f3d3ef680718cb53b2b6d4b51b341b2a0) |
| MockUSDY | [`0x4059ae416f06214e92f66a544064b529a31689aa`](https://sepolia.mantlescan.xyz/address/0x4059ae416f06214e92f66a544064b529a31689aa) |

---

## Mantle ecosystem integration depth

OmenVault doesn't *use* Mantle, it's composed of Mantle primitives.

| Primitive | How OmenVault uses it | Code |
|---|---|---|
| **USDT0** | Canonical settlement currency. All deposits, payouts, and bot accounting denominated in USDT0. | [`Market.sol`](apps/contracts/src/Market.sol), [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol) |
| **sUSDe** (Ethena) | High-yield collateral tier, vault deposits USDT0, converts to USDe, stakes for sUSDe. On resolution, unstakes and redeems. Yield accrues via ERC-4626 share-price growth. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/ISUSDe.sol`](apps/contracts/src/interfaces/ISUSDe.sol) |
| **USDY** (Ondo) | Conservative collateral tier, vault mints USDY against USDT0; yield accrues via per-second price accumulator. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/IUSDY.sol`](apps/contracts/src/interfaces/IUSDY.sol) |
| **Pyth** | Price feed used by Oracle C as a redundant third data source on price-based markets (BTC/ETH closes, ATH/floor). Hermes pull-based, no API key needed. | [`interfaces/IPyth.sol`](apps/contracts/src/interfaces/IPyth.sol), [`bots/oracle-swarm/src/datasources/pyth.ts`](bots/oracle-swarm/src/datasources/pyth.ts) |
| **cmETH** | v2 premium tier, ETH-denominated markets settled in cmETH for yield-on-yield. Documented as roadmap; constructor-level wiring is in place. | Roadmap |
| **Mantle mainnet + Sepolia** | All seven core contracts deployed and verified on both Mantle mainnet (chain 5000, 2026-05-25) and Sepolia (chain 5003). Block-explorer-linked from every market UI. | [`script/DeployMainnet.s.sol`](apps/contracts/script/DeployMainnet.s.sol), [`script/Deploy.s.sol`](apps/contracts/script/Deploy.s.sol) |

**The thesis:** any other chain forces you to bridge or wrap at least one of these. On Mantle, the entire stack is all native in a single transaction. That's why yield-while-betting ships here first.

---

## Partner & sponsor integrations

| Partner | Track | How OmenVault integrates | Code |
|---|---|---|---|
| **Mantle** | Settlement chain | All 7 contracts deployed on Mantle mainnet (chain 5000) and Sepolia (chain 5003), verified on Mantlescan. Real USDT0 on mainnet. sUSDe + USDY + Pyth + cmETH primitives. | Entire `apps/contracts/` |
| **Allora** | AI × Data | **On-chain consumer** reads forecasts with freshness checks. **Off-chain writer bot** polls Upshot v2 endpoint and posts P(YES) on-chain every 60s. Topic ID is pinned to each market at creation. Trader reads `getForecast(topicId)` for position sizing. | [`AlloraConsumer.sol`](apps/contracts/src/AlloraConsumer.sol), [`bots/allora-writer/`](bots/allora-writer/), [`bots/trader/src/allora.ts`](bots/trader/src/allora.ts) |
| **Nansen** | AI Alpha | Watcher bot polls `/token-screener` for smart-money labels and netflow on tokens referenced by active markets. Caches 24h to respect free-tier quota. Exposes localhost:7755 HTTP endpoint that trader reads. Graceful demo-mode fallback if no API key. | [`bots/nansen-watcher/`](bots/nansen-watcher/) |
| **Ethena (sUSDe)** | RWA | High-yield collateral tier. Vault deposits → stakes → accrues. Mock mirrors mainnet ERC-4626 surface exactly. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/ISUSDe.sol`](apps/contracts/src/interfaces/ISUSDe.sol) |
| **Ondo (USDY)** | RWA | Conservative tier. Vault mints USDY against USDT0; yield via price accumulator. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/IUSDY.sol`](apps/contracts/src/interfaces/IUSDY.sol) |
| **Pyth** | Oracle infra | Oracle C uses Pyth Hermes as a redundant price source. Pull-based, no key. | [`bots/oracle-swarm/src/datasources/pyth.ts`](bots/oracle-swarm/src/datasources/pyth.ts) |
| **Byreal** | Skills CLI | **6 published skills** covering the full market lifecycle: create-market, enter, trade-ai, vote-oracle, finalize, claim. Each ships with proper YAML frontmatter, `requires.env`, `requires.bins`. | [`bots/byreal-skills/`](bots/byreal-skills/) |
| **Anthropic** | LLM | `claude-haiku-4-5` reads Allora + Nansen + market price into a structured `{action, side, sizeUsdt0, confidence, reasoning}` decision. Reasoning blob pinned to IPFS, hash emitted via `DecisionLog`. | [`bots/trader/src/anthropic.ts`](bots/trader/src/anthropic.ts) |
| **Pinata** | IPFS | Real Pinata JWT integration for reasoning blob storage. Deterministic mock-CID fallback for dev. Used by trader, oracle swarm, allora-writer. | [`bots/shared/src/ipfs.ts`](bots/shared/src/ipfs.ts) |

---

## Architecture

```
                ┌──────────────────┐     ┌──────────────────┐
                │  AgentRegistry   │ <── │  MarketFactory   │
                │  (ERC-8004 SBT)  │     └────────┬─────────┘
                └──────────────────┘              │ creates
                        ▲                          ▼
                        │                   ┌──────────────┐    ┌──────────────────┐
                        │                   │   Market     │ ── │ CollateralVault  │
                        │                   │  (LMSR)      │    │  USDT0 ⇄ sUSDe   │
                        │                   └──────┬───────┘    │  USDT0 ⇄ USDY    │
                        │                          │ resolve()  └──────────────────┘
                        │ adjustReputation         │
                        │                   ┌──────┴───────┐    ┌──────────────────┐
                        └─────────────────  │ OracleSwarm  │ ── │  AlloraConsumer  │
                                            │ (3-of-3 SBT) │    │  forecasts        │
                                            └──────┬───────┘    └──────────────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │ DecisionLog  │  ← all bot decisions
                                            └──────────────┘
```

**Off-chain agents (all ERC-8004 registered):**
- **Trader**: LLM reads 3 signals → sized position. Headline AI surface.
- **Oracle Swarm A/B/C**: three independent resolvers with disjoint data sources.
- **Allora Writer**: posts forecast on-chain every 60s.
- **Nansen Watcher**: smart-money flow signal for the trader.

Full deep-dive: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Agent details: [`AGENTS.md`](AGENTS.md).

---

## Target market

OmenVault is built for three audiences that prediction markets currently fail.

### 1. Long-horizon retail bettors ($5–50k tickets)

Anyone who's ever wanted to take a 90-day or 180-day position on an election, a regulatory decision, or a quarterly macro outcome, and balked at the dead-money cost. At a 5% RWA tier on a 90-day market, OmenVault returns roughly **1.25% more capital** than any other prediction market, regardless of outcome. For the bettor, that's the difference between a positive-EV market and a marginal one.

**Acquisition channel:** crypto-native Twitter/X, prediction-market subreddits, Allora and Nansen audiences (their dashboards lead users directly into our markets).

### 2. Quant desks running directional AI agents ($50k–5M)

The Turing Test Hackathon's organizing thesis, that on-chain agents are about to compete with humans on capital allocation, is OmenVault's exact wedge. Every agent on OmenVault is an ERC-8004 soulbound NFT with a permanent on-chain track record: win rate, sizing discipline, reasoning quality, oracle accuracy. **A quant desk can launch a strategy, build verifiable reputation, and have that reputation be portable across protocols** (ERC-8004 is the emerging cross-protocol identity standard).

**Acquisition channel:** open-source the trader template (`bots/trader/`); make it forkable. Every new trader agent is sticky TVL for the protocol.

### 3. Institutional treasuries hedging real exposure ($500k+)

This is the v2 wedge. A DAO treasury holding $20M of stablecoins is already a Polymarket-shaped problem, they want to hedge governance outcomes, regulatory decisions, and macro tail risks, but Polymarket's collateral model means the hedge bleeds yield. OmenVault's RWA leg means a DAO can hedge a 180-day political risk **without losing 6% of treasury yield** to do it. That's the conversation we want to be having at year-end.

**Acquisition channel:** direct outreach to DAO treasuries (Aave, Lido, Optimism Collective) and crypto-native funds; the cmETH premium tier on v2 (ETH-denominated markets) is the institutional unlock.

### Market sizing (conservative)

| Slice | Today | Year-1 capture (conservative) | Year-3 (with cmETH + institutional tier) |
|---|---|---|---|
| Crypto prediction-market open interest | ~$400M (Polymarket + Limitless + Azuro combined) | $20M | $200M |
| Tokenized RWA TVL on Mantle | ~$80M (Q1 2026, growing) | $40M sticky | $400M sticky |
| ERC-8004 agent economy | nascent | 50 registered trader agents | 5,000+ |

A 5% take of the crypto prediction-market TAM in year 3, combined with the RWA TVL pulled onto Mantle as a side effect, is the bull case. The bear case (10% of that) still moves the needle for Mantle's RWA-TVL story.

---

## Roadmap

OmenVault ships in three phases. The hackathon submission is v1.0.

### v1.0: **The Turing Test Hackathon 2026 submission** (shipped)

- ✅ 7 core contracts on Mantle mainnet (chain 5000) **and** Mantle Sepolia, all verified (LMSR, soulbound agents, oracle swarm, vault rotation)
- ✅ Trader agent with LLM signal synthesis (Allora + Nansen + market price)
- ✅ 3-agent oracle swarm with disjoint data sources + reputation updates
- ✅ Full Next.js app, 10 routes, wagmi wallet integration, streaming reasoning UI
- ✅ 6 Byreal skills covering the full market lifecycle
- ✅ 33 passing Foundry tests + invariant suite

### v1.1: **Polish + missing pieces** (June 2026, post-hackathon)

- `Market.exit()`, pre-resolution exit with 1% LMSR fee (in current contracts as optional)
- Mainnet token swap: USDT0, real sUSDe, real USDY (one-line constructor change in `Deploy.s.sol`)
- WalletConnect v2 + Coinbase Wallet + Safe wallet support for institutional users
- Fill the 5 remaining oracle/invariant test stubs
- Allora "binary outcome probability" topic proposal (deeper integration than ETH/USD topic 14)

### v2.0: **cmETH premium tier + institutional onboarding** (Q3 2026)

- **cmETH collateral tier** for ETH-denominated markets, yield-on-yield via Mantle's restaking primitive
- **Permissioned market templates** for DAO treasuries (whitelisted creators, larger min stakes, longer resolution windows)
- **Reputation-weighted oracle staking**: oracles bond capital that slashes on minority votes
- **Caladan-style market-making LP pool**: programmatic counterparty for thin markets
- **Allora topic v2**: proposal for a native "prediction-market probability" topic

### v3.0: **Cross-chain agent identity + secondary markets** (2027)

- ERC-8004 identity portability, trader reputation usable across Mantle, Base, Hyperliquid
- Secondary markets on outstanding positions (LMSR LP token transferability)
- Subscription-based agent following (copy-trade an ERC-8004 trader, fee accrues to that NFT)
- Mobile app (React Native) with one-tap position UX

---

## Revenue model & sustainability

OmenVault is designed to capture protocol fees in three places without taxing bettor capital:

| Stream | Bps | Source | Notes |
|---|---|---|---|
| **Yield-share fee** | 1000 (10%) of accrued yield | Vault keeps 10% of RWA yield; winners get 90% pro-rata | The "free money" leg, bettors come out ahead net-of-fee because the alternative is 0%. |
| **LMSR exit fee** | 100 (1%) on pre-resolution exits | `Market.exit()` (v1.1) | Compensates LMSR LPs for inventory risk. |
| **Resolution fee** | 50 (0.5%) of market volume | Paid to majority oracle voters pro-rata to reputation | Self-funding oracle incentive. Aligns oracles with truth-seeking. |

**Conservative TVL projection (year 1):** even at $20M peak open-interest with an average market duration of 30 days at the sUSDe tier, protocol revenue = ~$20M × 12% × (30/365) × 10% = **~$19.7k/month** from yield-share alone. Stacks linearly with volume.

**Why this is bullish for Mantle:** every market open is sUSDe TVL added to Mantle. Long-horizon markets, the ones OmenVault uniquely enables, keep that TVL sticky for weeks to months. A $50M open-interest equilibrium drives ~$50M sticky sUSDe + USDY TVL through Mantle as a side-effect.

---

## Tracks: The Turing Test Hackathon 2026

OmenVault is submitted to Phase II ("AI Awakening", May 1 – June 15, 2026) on [DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026).

| Priority | Track | Sponsor | Why we fit |
|---|---|---|---|
| **Primary** | **AI × RWA** | Mantle | RWA collateral (sUSDe + USDY) + AI agents at the core of every market. Dynamic yield strategies and risk management on USDY and Mantle-native primitives, the literal track description. |
| **Secondary** | **Agentic Economy** | Byreal | 6 published Byreal skills cover the full lifecycle: create-market, enter, trade-ai, vote-oracle, finalize, claim. Each agent has an ERC-8004 wallet + signing keys + on-chain reputation. |
| **Cross** | **Grand Champion** | Mantle | "Top Overall Business Potential, Completion & Mantle Ecosystem Fit", protocol is feature-complete, deployed, with a four-primitive Mantle integration and clear revenue model. |
| **Cross** | **Best UI/UX** | Mantle | Streaming LLM reasoning, animated yield bar, three-card oracle swarm with stamp animations, dark editorial theme (Cabinet Grotesk + Geist). |
| **Cross** | **Community Voting** | Mantle | Public Vercel deploy + X-thread campaign with #MantleAIHackathon. |

**The three pillars Mantle says define a winning project, and where we hit them:**

| Pillar | OmenVault implementation |
|---|---|
| **On-chain benchmarking** | `DecisionLog` records every agent decision + IPFS reasoning hash. Full audit stream on `/audit`. |
| **ERC-8004 agent identity** | `AgentRegistry` is the soulbound ERC-721. Reputation updates on every oracle vote. Transfer reverts. |
| **Radical transparency** | Every reasoning blob pinned to IPFS. Hash emitted on-chain. Click any decision in `/audit` → opens the full LLM thought process. |

---

## Repo layout

```
omenvault/
├── apps/
│   ├── contracts/           # Foundry, Solidity 0.8.26
│   │   ├── src/             # 7 core contracts + interfaces + mocks
│   │   ├── script/Deploy.s.sol
│   │   └── test/            # 33 passing tests + invariants
│   └── web/                 # Next.js 15 App Router
├── bots/
│   ├── trader/              # LLM trader, Anthropic + Allora + Nansen
│   ├── oracle-swarm/        # 3 independent resolvers (A/B/C)
│   ├── nansen-watcher/      # Smart-money flow HTTP cache
│   ├── allora-writer/       # On-chain forecast publisher
│   ├── shared/              # IPFS pinning, resilient RPC, env loader
│   └── byreal-skills/       # 6 skill manifests
└── docs/
    └── ARCHITECTURE.md
```

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Foundry, `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Install

```bash
git clone https://github.com/big14way/OmenVault
cd omenvault
pnpm install
cp .env.example .env       # then fill in keys (see Environment below)
```

### Build & test contracts

```bash
pnpm contracts:build
pnpm contracts:test        # 33 tests pass
```

### Run the web app

```bash
pnpm web:dev               # http://localhost:3000
```

### Run the full demo (web + all bots)

```bash
pnpm demo                  # boots web + nansen + allora-writer + trader + 3 oracles
```

To boot just the bots without the web (for headless test runs):

```bash
pnpm demo:bots
```

### Deploy to Mantle Sepolia

```bash
cd apps/contracts
forge script script/Deploy.s.sol \
  --rpc-url $MANTLE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

## Environment

Copy [`.env.example`](.env.example) → `.env`. Required keys:

| Key | Purpose | Required? |
|---|---|---|
| `MANTLE_SEPOLIA_RPC_URL` | Mantle Sepolia RPC | Yes |
| `PRIVATE_KEY` | Deployer wallet | For deploy only |
| `TRADER_PRIVATE_KEY` | Trader agent wallet | For trader bot |
| `ORACLE_A/B/C_PRIVATE_KEY` | Oracle agent wallets | For oracle bots |
| `ANTHROPIC_API_KEY` | LLM reasoning | Falls back to heuristic if absent |
| `ALLORA_API_BASE` | Allora forecast REST | Falls back to CoinGecko momentum if absent |
| `NANSEN_API_KEY` | Smart-money flow | Falls back to deterministic demo signal if absent |
| `PINATA_JWT` | IPFS pinning | Falls back to deterministic mock CIDs if absent |
| `NEXT_PUBLIC_*` | Frontend contract addresses + RPC | Frontend falls back to mocks per-page |

**All third-party API keys are optional for a demo run.** Every external integration has a deterministic dev-mode fallback so the UI and bots never break during a presentation.

---

## Top-level scripts

| Command | Effect |
|---|---|
| `pnpm contracts:build` | `forge build` in `apps/contracts` |
| `pnpm contracts:test` | `forge test -vv`, 33 tests pass |
| `pnpm contracts:deploy` | `forge script Deploy.s.sol --broadcast` |
| `pnpm web:dev` | Next.js dev server on :3000 |
| `pnpm web:build` | Production build |
| `pnpm bots:trader` | Run the trader bot once-through |
| `pnpm bots:oracle` | Run one oracle (set `ORACLE=A` / `B` / `C`) |
| `pnpm bots:nansen` | Run the Nansen watcher (HTTP on :7755) |
| `pnpm demo:seed` | Seed Sepolia with a demo market + faucet USDT0 + print bot commands |
| `pnpm demo:bots` | All 5 bots in parallel via concurrently |
| `pnpm demo` | Web + all 5 bots in parallel, the one-command demo |

---

## Documentation

- [`DEPLOYMENT.md`](DEPLOYMENT.md), step-by-step Vercel (web) + Railway (bots) deploy guide
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), contracts, LMSR math, data flow
- [`AGENTS.md`](AGENTS.md), agent identity, decision schemas, oracle voting
- [`ATTRIBUTION.md`](ATTRIBUTION.md), partners, sponsors, open-source credits

## License

MIT, see [`LICENSE`](LICENSE).
