# @omenvault/web

Frontend for OmenVault — Next.js 15 App Router, wagmi + viem, dark-theme editorial design system. See the [root README](../../README.md) for the full project overview and the [architecture doc](../../docs/ARCHITECTURE.md) for component-level depth.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing — protocol product page |
| `/markets` | All active markets with live LMSR prices and yield ribbon |
| `/markets/[id]` | Market detail: question, OutcomeBar, PositionForm, AgentReasoningCard, OracleSwarmPanel, YieldBar, ActivityFeed |
| `/markets/new` | Permissionless market creation |
| `/agents/registry` | All ERC-8004 agents with type, reputation, capital deployed |
| `/agents/[id]` | Agent profile: history, reasoning samples, reputation graph |
| `/oracle/[id]` | Oracle dashboard (oracle-node operators only) |
| `/audit` | Real-time DecisionLog event stream, filterable |
| `/portfolio` | Connected wallet's open positions and claimable winnings |
| `/swarm` | Live oracle-swarm status across all open markets |

## Headline components

- **`AgentReasoningCard`** — streams LLM reasoning trail with typewriter effect, shows Allora forecast + Nansen signal + confidence + IPFS link.
- **`OracleSwarmPanel`** — three-card live resolution; handles 3-of-3 and 2-of-1 split; visible majority tally.
- **`YieldBar`** — animated RWA yield ticker on every market.
- **`PositionForm`** — wallet-connected approve + enter flow with balance checks.
- **`OutcomeBar`** — animated YES/NO LMSR price.
- **`MarketCard`** — list cell with live agent activity chip.
- **`ActivityFeed`** — real-time `DecisionLog` event feed.

## Setup

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

Reads `NEXT_PUBLIC_*` contract addresses from the root-level `.env` (see [`.env.example`](../../.env.example)). Pages fall back to mock data with clear messaging if addresses are absent so the UI never breaks during a demo.

## Design system

- **Display:** Cabinet Grotesk (Fontshare CDN)
- **Body:** Geist Sans
- **Mono:** Geist Mono
- **Palette:** Night `#0C0D11` · Surface `#14161C` · Bone `#E8E5DD` · Mint `#6FD9AB` (YES) · Coral `#E66D54` (NO) · Amber `#F2A341` (CTA) · Violet `#9089E0` (oracle)
- Mobile-first, responsive at `md:` (768px+) and beyond.

## Stack

- Next.js 15 (App Router, React 19)
- wagmi v2 + viem (RPC + wallet)
- TanStack Query (data layer)
- Tailwind CSS + Framer Motion
- TypeScript strict
