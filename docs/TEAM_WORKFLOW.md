# Team workflow

How three people don't collide.

## File ownership

To minimize merge conflicts, each file has a primary owner. PRs from non-owners require the owner's review.

| File | Primary owner | Reviewer |
|---|---|---|
| `apps/contracts/src/AgentRegistry.sol` | Lead | Senior |
| `apps/contracts/src/MarketFactory.sol` | Lead | Senior |
| `apps/contracts/src/Market.sol` | Lead + Senior (paired) | — |
| `apps/contracts/src/CollateralVault.sol` | Lead | Senior |
| `apps/contracts/src/OracleSwarm.sol` | Senior | Lead |
| `apps/contracts/src/AlloraConsumer.sol` | Senior | Lead |
| `apps/contracts/src/DecisionLog.sol` | Lead | — |
| `bots/trader/` | Lead | Senior |
| `bots/oracle-swarm/` | Senior | Lead |
| `bots/nansen-watcher/` | Lead | — |
| `bots/byreal-skills/` | Lead | Senior |
| `apps/web/**` | Frontend | Lead (UX/numbers review only) |

## Branching

- `main` is protected.
- Feature branches:
  - `feat/contracts-<area>` — Lead/Senior
  - `feat/bots-<area>` — Lead/Senior
  - `feat/web-<area>` — Frontend
- PRs require **1 review** before merge.
- Lead reviews frontend PRs only for **content correctness** (numbers shown match contract reads).

## Daily 15-min standup

1. What I shipped yesterday.
2. What I'm shipping today.
3. What's blocking me.

## Slack channels

- `#omenvault-build` — general
- `#omenvault-blockers` — escalation only
- `#omenvault-prs` — PR review pings

## Demo Day rehearsal

Day 17: full dress rehearsal. All three people present in the recording session. Lead drives the contract demo. Frontend drives the UI demo. Senior narrates oracle swarm.

## Day-by-day plan

### Days 1–3 (parallel)
- **Lead:** AgentRegistry + MarketFactory + Market skeleton (interfaces only, no logic).
- **Senior:** OracleSwarm + AlloraConsumer + Pyth interface.
- **Frontend:** Next.js scaffold + design system + landing + `/markets` skeleton with mock data.
- Sync EOD Day 3: contracts compile, frontend renders.

### Days 4–7 (parallel)
- **Lead + Senior (paired):** Market.sol logic — LMSR, position accounting, resolution hook.
- **Lead:** CollateralVault + tier routing.
- **Senior:** OracleSwarm voting + finalization + reputation update.
- **Frontend:** `/markets/[id]` with real reads (no writes yet) + MarketCard + OutcomeBar.
- Sync EOD Day 7: end-to-end happy path test passes.

### Days 8–11 (parallel)
- **Lead:** Trader bot (the AI surface). Nansen watcher.
- **Senior:** Oracle swarm bots (three of them) with different data sources.
- **Frontend:** PositionForm, AgentReasoningCard, OracleSwarmPanel, YieldBar. Wire wallet writes.
- Sync EOD Day 11: AI trader takes positions on testnet.

### Days 12–14 (parallel)
- **Lead:** Byreal skills (6 manifests + CLI). Integration tests.
- **Senior:** Invariant suite. Polish OracleSwarm edge cases.
- **Frontend:** `/audit`, `/agents/[id]`, `/oracle/[id]`. Mobile-responsive sweep.
- Sync EOD Day 14: full feature set ships.

### Days 15–17 (all)
Bug bash. Fix everything that broke during integration. README, AGENTS.md, ATTRIBUTION.

### Day 18 (all)
Demo video. Lead drives, Senior + Frontend review.

### Day 19 (all)
DoraHacks submission. Sponsor track checkboxes. Public repo. Pitch deck.

### Days 20–21 (all)
Buffer + Twitter thread.
