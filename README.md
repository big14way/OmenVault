# OmenVault

> Prediction markets on Mantle where AI agents take positions on real-world outcomes, and settlement collateral earns RWA yield while bets are open.

## What it is

OmenVault is a prediction-market protocol on **Mantle** where:

- Bettors deposit **USDT0**.
- The vault converts to **sUSDe** (Ethena synthetic dollar, ~12% APY) or **USDY** (Ondo T-bills, ~5% APY) based on a per-market collateral tier.
- AI agents — gated by **ERC-8004** soulbound identity NFTs — read **Allora** prediction-network forecasts to size positions and consume **Nansen** smart-money flow signals to time entries.
- Markets are resolved by a **multi-agent oracle swarm** (three independent ERC-8004 agents post signed verdicts; majority wins).
- On resolution, RWA collateral is unwound back to USDT0 and paid out — winners get principal + RWA yield earned during the bet + market upside.

## Hackathon positioning

| Dimension | Value |
|---|---|
| Primary track | AI x RWA (Track 3) |
| Secondary track | Agentic Wallets & Economy (Track 6) |
| Tertiary track | AI Alpha & Data (Track 2) |
| Network | Mantle Sepolia (chain id 5003) |
| Hard requirements | Solidity on Mantle Sepolia, ERC-8004 NFTs for every agent, every decision on-chain, material AI surface |

## Live on Mantle Sepolia

Deployer: [`0x3C343AD077983371b29fee386bdBC8a92E934C51`](https://sepolia.mantlescan.xyz/address/0x3C343AD077983371b29fee386bdBC8a92E934C51) · Deployed 2026-05-12

| Contract | Address |
|---|---|
| MarketFactory | [`0xf22f...c1b2`](https://sepolia.mantlescan.xyz/address/0xf22f7671529aecfebdca582dc48693b7ad94c1b2) |
| AgentRegistry | [`0x4b6c...3a76`](https://sepolia.mantlescan.xyz/address/0x4b6ca7769568f154f3d1bb274d20f5ef9ded3a76) |
| OracleSwarm | [`0x58c9...9a1e`](https://sepolia.mantlescan.xyz/address/0x58c9bb07859967be7d10e36a3a329a496f5f9a1e) |
| AlloraConsumer | [`0xf2d1...727f`](https://sepolia.mantlescan.xyz/address/0xf2d15ca4d4d6c427d304ab78b6806ac90435727f) |
| DecisionLog | [`0xf63f...5689`](https://sepolia.mantlescan.xyz/address/0xf63fbf2279a7c4b7049692441ff0a0f5cde75689) |
| MockUSDT0 | [`0xcf0e...857b`](https://sepolia.mantlescan.xyz/address/0xcf0e14b2a482bbedb2edadc8c4814dcfd712857b) |
| MockSUSDe | [`0x85cf...b2a0`](https://sepolia.mantlescan.xyz/address/0x85cf3d6f3d3ef680718cb53b2b6d4b51b341b2a0) |
| MockUSDY | [`0x4059...89aa`](https://sepolia.mantlescan.xyz/address/0x4059ae416f06214e92f66a544064b529a31689aa) |

### Why mocks for USDT0 / sUSDe / USDY?

None of the three target tokens have an official Mantle Sepolia deployment as of May 2026. The mocks mirror each mainnet surface (USDT0: 6-dec non-rebasing; sUSDe: ERC-4626 share-price growth ~12% APY; USDY: 18-dec price-accruing ~5% APY). The production swap-in is a one-line constructor change — mainnet addresses are documented in [`apps/contracts/script/Deploy.s.sol`](apps/contracts/script/Deploy.s.sol).

### Mantle primitives used
- **USDT0** — settlement currency
- **sUSDe** — high-yield collateral tier
- **USDY** — conservative collateral tier
- **Pyth** — price oracles
- **cmETH** — premium-tier collateral (v2)

### Required partners
- **Allora** — forecast topics drive position sizing (most native fit of any concept)
- **Nansen** — smart-money flow gates entry timing
- **Byreal Skills CLI** — 6 published skills cover the market lifecycle

## Repo layout

```
omenvault/
├── apps/
│   ├── contracts/         # Foundry — Solidity 0.8.26
│   └── web/               # Next.js 15 App Router
├── bots/
│   ├── trader/            # Position-taking AI agent
│   ├── oracle-swarm/      # 3 resolution agents
│   ├── nansen-watcher/    # Smart-money flow alerts
│   ├── shared/            # Shared TS utilities
│   └── byreal-skills/     # 6 Byreal skill manifests
└── docs/
    ├── ARCHITECTURE.md
    ├── DEMO_SCRIPT.md
    ├── PITCH.md
    └── TEAM_WORKFLOW.md
```

## Getting started

### Prerequisites
- Node.js >= 20
- pnpm >= 9 (or npm)
- Foundry — install via `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Install
```bash
# Install JS workspaces
pnpm install

# Build contracts
cd apps/contracts && forge install && forge build

# Run contract tests
forge test

# Start the web app (dev)
cd ../web && pnpm dev
```

### Environment
Copy `.env.example` to `.env` at the repo root. Bots and the web app each read from this file.

## Workspaces

This repo is a pnpm workspace monorepo. Top-level scripts:

| Command | Effect |
|---|---|
| `pnpm contracts:build` | `forge build` in `apps/contracts` |
| `pnpm contracts:test` | `forge test` in `apps/contracts` |
| `pnpm web:dev` | Next.js dev server |
| `pnpm web:build` | Production build of the web app |
| `pnpm bots:trader` | Run the trader bot |
| `pnpm bots:oracle` | Run the oracle swarm |
| `pnpm bots:nansen` | Run the Nansen watcher |

## Team

See [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) for file ownership, branching, and review rules.

## License

MIT — see [LICENSE](LICENSE).
