# @omenvault/web

> Frontend for OmenVault — Next.js 15 App Router. **Owned by the frontend team.**

This is a minimal scaffold. The frontend team should build out the design system and pages per [docs/ARCHITECTURE.md §7](../../docs/ARCHITECTURE.md) and the build brief.

## Required pages (Day 1–14 deliverables)

| Route | Purpose |
|---|---|
| `/` | Landing — protocol product page |
| `/markets` | List all active markets with current YES/NO prices |
| `/markets/[id]` | Single market: question, YES/NO chart, position UI, agent activity |
| `/markets/new` | Create market (permissionless) |
| `/agents/registry` | All registered agents with type, win rate, capital deployed |
| `/agents/[id]` | Single agent profile: history, reasoning samples, reputation |
| `/oracle/[id]` | Oracle dashboard: pending markets to vote on (oracle nodes only) |
| `/audit` | DecisionLog event stream |

## Critical UX moments

1. **Agent reasoning panel** — when an AI trader takes a position, render the LLM reasoning trail. This is the headline component.
2. **Oracle swarm resolution** — three oracle cards stream in over ~30s on resolve.
3. **Yield bar** — animated RWA yield ticker on every market page.

## Design system

- Display font: **Instrument Serif** (CDN)
- Body: **Geist**
- Mono: **Geist Mono**
- Palette: Ink `#0F1419`, Paper `#FAF7F2`, Twilight `#1E1B4B`, Forest `#1B5E3F` (YES), Crimson `#9B2C2C` (NO), Terracotta `#C04A2D` (CTA)
- Hero typography: `clamp(36px, 8vw, 96px)`
- Mobile-first; tested at 375px min-width

## Setup

```bash
pnpm install
pnpm dev
```

Reads contract addresses from the root-level `.env` file (see [.env.example](../../.env.example)) — the `NEXT_PUBLIC_*` keys.
