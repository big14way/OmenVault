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
| Network | Mantle Sepolia |
| Hard requirements | Solidity on Mantle Sepolia, ERC-8004 NFTs for every agent, every decision on-chain, material AI surface |

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
