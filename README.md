# OmenVault

> **Prediction markets on Mantle where settlement collateral earns RWA yield while bets are open, and AI agents — gated by ERC-8004 soulbound identity — both take positions and resolve outcomes.**

Live on **Mantle Sepolia** · Built for **The Turing Test Hackathon 2026** (Mantle) · Tracks: **AI × RWA** (primary, sponsored by Mantle) · **Agentic Economy** (secondary, sponsored by Byreal) · Grand Champion + Best UI/UX cross-prizes

---

## The problem

Every prediction market on every chain has the same dead-money problem.

- **Polymarket** holds hundreds of millions of USDC in escrow. It earns nothing for the lifetime of every market — sometimes days, often months.
- **Augur, Azuro, Limitless, Hubble** — same story. Stablecoin collateral sits idle from entry to resolution.
- **For long-horizon markets** (election cycles, regulatory outcomes, 6-month price targets) the opportunity cost is brutal: a 90-day market at 5% RWA yield silently burns ~1.25% of bettor capital that should belong to them.

The result: short-term, hype-driven markets dominate. Long-horizon, capital-efficient markets — the ones institutions would actually price — never form, because the carry cost is too high.

## The solution

OmenVault treats the bet collateral as a yield-bearing asset for the entire lifetime of the market.

1. Bettors deposit **USDT0**.
2. Per-market `CollateralVault` rotates the deposit into **sUSDe** (Ethena, ~12% APY) or **USDY** (Ondo T-bills, ~5% APY) based on a per-market tier.
3. Yield accrues silently. A `YieldBar` on every market UI shows it live.
4. On resolution, the RWA position unwinds back to USDT0. **Winners receive principal + LMSR upside + a pro-rata share of accrued yield.**
5. AI agents — gated by **ERC-8004** soulbound identity NFTs — take positions (Trader) and resolve outcomes (3-agent Oracle Swarm), with every decision pinned to IPFS and emitted on-chain.

**Why this only works on Mantle:** sUSDe + USDY + USDT0 + Pyth are all native primitives here. On Arc, Cronos, SKALE, Base, or Arbitrum at least one leg is missing or wrapped — the composition breaks. OmenVault is a *Mantle-native* protocol, not a Mantle deployment of a chain-agnostic idea.

## Why this wins the hackathon

| Judge concern | How we answer it |
|---|---|
| "Is the AI surface material or cosmetic?" | LLM synthesizes **three external signals** (Allora forecast, Nansen smart-money flow, market price) into a sized position with a reasoning trail pinned to IPFS. Streaming typewriter on UI. Not a hardcoded heuristic. |
| "Does it actually use Mantle?" | USDT0 settlement · sUSDe high-yield tier · USDY conservative tier · Pyth price feed · cmETH on v2 roadmap. **Four** native primitives. |
| "Is the RWA leg real?" | sUSDe via ERC-4626 share-price growth (~12% APY); USDY via 18-dec price-accruing token (~5% APY). Mocks mirror mainnet surface exactly — production swap is a one-line constructor change. |
| "Is the agent identity real?" | Every agent is an **ERC-8004 soulbound ERC-721**. Reputation updates on-chain after every oracle vote. Transfer attempts revert. |
| "Is there a real partner integration story?" | Allora (forecast → on-chain `AlloraConsumer` + trader REST), Nansen (smart-money flow gates entry timing), Pinata (IPFS pinning), 6 published Byreal skills covering the full market lifecycle. |
| "Is it actually live?" | Yes — see deployed addresses below. CI green (33 tests pass). Full demo runs end-to-end with `pnpm demo`. |

---

## Live on Mantle Sepolia (chain id 5003)

Deployer: [`0x3C343AD077983371b29fee386bdBC8a92E934C51`](https://sepolia.mantlescan.xyz/address/0x3C343AD077983371b29fee386bdBC8a92E934C51) — deployed 2026-05-12

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

### Why mocks for the three tokens?

None of USDT0, sUSDe, or USDY have an official Mantle Sepolia deployment as of May 2026. Our mocks **mirror the mainnet surface exactly** — USDT0 is 6-dec non-rebasing; sUSDe is ERC-4626 with share-price growth at ~12% APY; USDY is 18-dec price-accruing at ~5% APY. The production swap is a one-line constructor change; mainnet addresses are documented in [`apps/contracts/script/Deploy.s.sol`](apps/contracts/script/Deploy.s.sol).

---

## Mantle ecosystem integration depth

OmenVault doesn't *use* Mantle — it's composed of Mantle primitives.

| Primitive | How OmenVault uses it | Code |
|---|---|---|
| **USDT0** | Canonical settlement currency. All deposits, payouts, and bot accounting denominated in USDT0. | [`Market.sol`](apps/contracts/src/Market.sol), [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol) |
| **sUSDe** (Ethena) | High-yield collateral tier — vault deposits USDT0, converts to USDe, stakes for sUSDe. On resolution, unstakes and redeems. Yield accrues via ERC-4626 share-price growth. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/ISUSDe.sol`](apps/contracts/src/interfaces/ISUSDe.sol) |
| **USDY** (Ondo) | Conservative collateral tier — vault mints USDY against USDT0; yield accrues via per-second price accumulator. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/IUSDY.sol`](apps/contracts/src/interfaces/IUSDY.sol) |
| **Pyth** | Price feed used by Oracle C as a redundant third data source on price-based markets (BTC/ETH closes, ATH/floor). Hermes pull-based — no API key needed. | [`interfaces/IPyth.sol`](apps/contracts/src/interfaces/IPyth.sol), [`bots/oracle-swarm/src/datasources/pyth.ts`](bots/oracle-swarm/src/datasources/pyth.ts) |
| **cmETH** | v2 premium tier — ETH-denominated markets settled in cmETH for yield-on-yield. Documented as roadmap; constructor-level wiring is in place. | Roadmap |
| **Mantle Sepolia** | All seven core contracts deployed and verified. Block-explorer-linked from every market UI. | [`script/Deploy.s.sol`](apps/contracts/script/Deploy.s.sol), [`broadcast/Deploy.s.sol/5003/`](apps/contracts/broadcast/) |

**The thesis:** any other chain forces you to bridge or wrap at least one of these. On Mantle, the entire stack composes natively in a single transaction. That's why yield-while-betting ships here first.

---

## Partner & sponsor integrations

| Partner | Track | How OmenVault integrates | Code |
|---|---|---|---|
| **Mantle** | Settlement chain | All 7 contracts on Mantle Sepolia. USDT0 native. sUSDe + USDY + Pyth + cmETH primitives. | Entire `apps/contracts/` |
| **Allora** | AI × Data | **On-chain consumer** reads forecasts with freshness checks. **Off-chain writer bot** polls Upshot v2 endpoint and posts P(YES) on-chain every 60s. Topic ID is pinned to each market at creation. Trader reads `getForecast(topicId)` for position sizing. | [`AlloraConsumer.sol`](apps/contracts/src/AlloraConsumer.sol), [`bots/allora-writer/`](bots/allora-writer/), [`bots/trader/src/allora.ts`](bots/trader/src/allora.ts) |
| **Nansen** | AI Alpha | Watcher bot polls `/token-screener` for smart-money labels and netflow on tokens referenced by active markets. Caches 24h to respect free-tier quota. Exposes localhost:7755 HTTP endpoint that trader reads. Graceful demo-mode fallback if no API key. | [`bots/nansen-watcher/`](bots/nansen-watcher/) |
| **Ethena (sUSDe)** | RWA | High-yield collateral tier. Vault deposits → stakes → accrues. Mock mirrors mainnet ERC-4626 surface exactly. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/ISUSDe.sol`](apps/contracts/src/interfaces/ISUSDe.sol) |
| **Ondo (USDY)** | RWA | Conservative tier. Vault mints USDY against USDT0; yield via price accumulator. | [`CollateralVault.sol`](apps/contracts/src/CollateralVault.sol), [`interfaces/IUSDY.sol`](apps/contracts/src/interfaces/IUSDY.sol) |
| **Pyth** | Oracle infra | Oracle C uses Pyth Hermes as a redundant price source. Pull-based, no key. | [`bots/oracle-swarm/src/datasources/pyth.ts`](bots/oracle-swarm/src/datasources/pyth.ts) |
| **Byreal** | Skills CLI | **6 published skills** covering the full market lifecycle: create-market, enter, trade-ai, vote-oracle, finalize, claim. Each ships with proper YAML frontmatter, `requires.env`, `requires.bins`. | [`bots/byreal-skills/`](bots/byreal-skills/) |
| **Anthropic** | LLM | `claude-haiku-4-5` synthesizes Allora + Nansen + market price into a structured `{action, side, sizeUsdt0, confidence, reasoning}` decision. Reasoning blob pinned to IPFS, hash emitted via `DecisionLog`. | [`bots/trader/src/anthropic.ts`](bots/trader/src/anthropic.ts) |
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
- **Trader** — LLM synthesizes 3 signals → sized position. Headline AI surface.
- **Oracle Swarm A/B/C** — three independent resolvers with disjoint data sources.
- **Allora Writer** — posts forecast on-chain every 60s.
- **Nansen Watcher** — smart-money flow signal for the trader.

Full deep-dive: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Agent details: [`AGENTS.md`](AGENTS.md).

---

## Revenue model & sustainability

OmenVault is designed to capture protocol fees in three places without taxing bettor capital:

| Stream | Bps | Source | Notes |
|---|---|---|---|
| **Yield-share fee** | 1000 (10%) of accrued yield | Vault keeps 10% of RWA yield; winners get 90% pro-rata | The "free money" leg — bettors come out ahead net-of-fee because the alternative is 0%. |
| **LMSR exit fee** | 100 (1%) on pre-resolution exits | `Market.exit()` (v1.1) | Compensates LMSR LPs for inventory risk. |
| **Resolution fee** | 50 (0.5%) of market volume | Paid to majority oracle voters pro-rata to reputation | Self-funding oracle incentive. Aligns oracles with truth-seeking. |

**Conservative TVL projection (year 1):** even at $20M peak open-interest with an average market duration of 30 days at the sUSDe tier, protocol revenue = ~$20M × 12% × (30/365) × 10% = **~$19.7k/month** from yield-share alone. Stacks linearly with volume.

**Why this is bullish for Mantle:** every market open is sUSDe TVL added to Mantle. Long-horizon markets — the ones OmenVault uniquely enables — keep that TVL sticky for weeks to months. A $50M open-interest equilibrium drives ~$50M sticky sUSDe + USDY TVL through Mantle as a side-effect.

---

## Tracks — The Turing Test Hackathon 2026

OmenVault is submitted to Phase II ("AI Awakening", May 1 – June 15, 2026) on [DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026).

| Priority | Track | Sponsor | Why we fit |
|---|---|---|---|
| **Primary** | **AI × RWA** | Mantle | RWA collateral (sUSDe + USDY) + AI agents at the core of every market. Dynamic yield strategies and risk management on USDY and Mantle-native primitives — the literal track description. |
| **Secondary** | **Agentic Economy** | Byreal | 6 published Byreal skills cover the full lifecycle: create-market, enter, trade-ai, vote-oracle, finalize, claim. Each agent has an ERC-8004 wallet + signing keys + on-chain reputation. |
| **Cross** | **Grand Champion** | Mantle | "Top Overall Business Potential, Completion & Mantle Ecosystem Fit" — protocol is feature-complete, deployed, with a four-primitive Mantle integration and clear revenue model. |
| **Cross** | **Best UI/UX** | Mantle | Streaming LLM reasoning, animated yield bar, three-card oracle swarm with stamp animations, dark editorial theme (Cabinet Grotesk + Geist). |
| **Cross** | **Community Voting** | Mantle | Public Vercel deploy + X-thread campaign with #MantleAIHackathon. |

**The three pillars Mantle says define a winning project — and where we hit them:**

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
│   ├── contracts/           # Foundry — Solidity 0.8.26
│   │   ├── src/             # 7 core contracts + interfaces + mocks
│   │   ├── script/Deploy.s.sol
│   │   └── test/            # 33 passing tests + invariants
│   └── web/                 # Next.js 15 App Router
├── bots/
│   ├── trader/              # LLM trader — Anthropic + Allora + Nansen
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
- Foundry — `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Install

```bash
git clone https://github.com/<your-org>/omenvault
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
| `pnpm contracts:test` | `forge test -vv` — 33 tests pass |
| `pnpm contracts:deploy` | `forge script Deploy.s.sol --broadcast` |
| `pnpm web:dev` | Next.js dev server on :3000 |
| `pnpm web:build` | Production build |
| `pnpm bots:trader` | Run the trader bot once-through |
| `pnpm bots:oracle` | Run one oracle (set `ORACLE=A` / `B` / `C`) |
| `pnpm bots:nansen` | Run the Nansen watcher (HTTP on :7755) |
| `pnpm demo:seed` | Seed Sepolia with a demo market + faucet USDT0 + print bot commands |
| `pnpm demo:bots` | All 5 bots in parallel via concurrently |
| `pnpm demo` | Web + all 5 bots in parallel — the one-command demo |

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — contracts, LMSR math, data flow
- [`AGENTS.md`](AGENTS.md) — agent identity, decision schemas, oracle voting
- [`ATTRIBUTION.md`](ATTRIBUTION.md) — partners, sponsors, open-source credits

## License

MIT — see [`LICENSE`](LICENSE).
