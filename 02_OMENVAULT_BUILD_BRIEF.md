# OMENVAULT — Mantle Turing Test 2026 Build Brief (TEAM: 3 PEOPLE)

**You are Claude Code in VS Code, paired with a 3-person team: Gwill (lead Solidity), 1 senior Solidity dev (collaborator), 1 frontend dev.** This document is the single source of truth. Read end-to-end before writing code. Section §12 has the work-split that prevents merge conflicts. Mark sections done as you complete them.

---

## 1\. The product (1 paragraph)

OmenVault is a prediction-market protocol on Mantle where AI agents take positions on real-world outcomes, but their settlement collateral is held in tokenized RWAs that earn yield while bets are open. Bettors deposit USDT0; the vault converts to sUSDe (Ethena synthetic dollar, \~12% APY) or USDY (Ondo T-bills, \~5% APY) based on bettor preference. Agents — gated by ERC-8004 identity NFTs — read Allora's prediction-network forecasts to size positions, and consume Nansen smart-money flow signals to time entries. Markets are resolved via a multi-agent oracle (a "swarm" of three independent ERC-8004 agents that each post a signed verdict; majority wins). On resolution, the RWA-collateral is unwound back to USDT0 and paid out — winners get principal \+ RWA yield earned during the bet \+ market upside.

**Why this wins:** Three ETHGlobal winners independently arrived at variations of this pattern (Hubble Trading Arena at Buenos Aires, RACE at HackMoney 2026, DIVE at Cannes 2026 finalists) — meaning the design space is *judge-validated* by serious reviewers (Vitalik, Stani Kulechov, Jesse Pollak). All three shipped on plain stablecoins. **OmenVault adds the RWA collateral leg** — yield-while-betting is impossible on Arc, Cronos, or SKALE because none of them have sUSDe \+ USDY \+ USDT0 native. Mantle is the only chain where this composes.

---

## 2\. Hackathon positioning

| Dimension | Value |
| :---- | :---- |
| **Primary track** | AI × RWA (Track 3\) — yield strategies \+ risk management for RWAs |
| **Secondary track** | Agentic Wallets & Economy (Track 6\) — agents take positions, post verdicts |
| **Tertiary** | AI Alpha & Data (Track 2\) — Nansen-driven smart-money tracking is core |
| **Hard requirements** | Solidity on Mantle Sepolia, ERC-8004 NFTs for every agent, every decision on-chain, material AI surface |
| **Mantle primitives** | USDT0 (settlement), sUSDe (high-yield collateral tier), USDY (conservative tier), Pyth (price), cmETH (premium-tier collateral as v2) |
| **Required partners** | Allora (forecast topics drive position sizing — most native fit of any concept), Nansen (smart-money flow), Byreal Skills CLI (6 skills) |

**Stackable prize ceiling:** $25K floor / $50K ceiling. This is the highest-ceiling concept of the three because it stacks AI×RWA \+ Agentic Wallets \+ AI Alpha cross-prizes plus the deepest possible Allora integration (judges from Allora are on the panel).

**Sponsor reach (ranked):**

| Sponsor | Fit | Why |
| :---- | :---- | :---- |
| Allora | ★★★★★ | Their inference network IS the position-sizing input. Most native of any concept. |
| Hashed | ★★★★★ | RWA-collateralized prediction markets is institutional-trader catnip. |
| Nansen | ★★★★ | Smart-money flow gates entry timing. |
| Byreal | ★★★★ | 6 published skills covering market lifecycle. |
| Caladan | ★★★★ | LP-side of the markets (they make markets — natural counterparty). |
| Virtuals | ★★★ | ERC-8004 NFT per agent \+ multi-agent oracle swarm. |
| BGA | ★★ | Less natural; could pivot a "civic markets for emerging-market policy events" angle. |
| Animoca | ★ | No fit. |

---

## 3\. Repo structure

omenvault/

├── README.md

├── AGENTS.md

├── ATTRIBUTION.md

├── LICENSE

├── .env.example

├── .gitignore

├── package.json

├── apps/

│   ├── contracts/                                \# Foundry

│   │   ├── foundry.toml

│   │   ├── remappings.txt

│   │   ├── src/

│   │   │   ├── AgentRegistry.sol                 \# ERC-8004 soulbound

│   │   │   ├── MarketFactory.sol                 \# Creates markets

│   │   │   ├── Market.sol                        \# Per-market state, positions, resolution

│   │   │   ├── CollateralVault.sol               \# USDT0 ⇄ sUSDe/USDY rotation

│   │   │   ├── OracleSwarm.sol                   \# 3-agent resolution swarm

│   │   │   ├── AlloraConsumer.sol                \# On-chain Allora reader

│   │   │   ├── DecisionLog.sol

│   │   │   ├── interfaces/

│   │   │   │   ├── ISUSDe.sol

│   │   │   │   ├── IUSDY.sol

│   │   │   │   ├── IPyth.sol

│   │   │   │   └── IAlloraConsumer.sol

│   │   │   └── mocks/

│   │   │       ├── MockUSDT0.sol

│   │   │       ├── MockSUSDe.sol

│   │   │       └── MockUSDY.sol

│   │   ├── script/Deploy.s.sol

│   │   └── test/

│   │       ├── AgentRegistry.t.sol

│   │       ├── MarketFactory.t.sol

│   │       ├── Market.t.sol

│   │       ├── CollateralVault.t.sol

│   │       ├── OracleSwarm.t.sol

│   │       ├── EndToEnd.t.sol

│   │       └── invariants/

│   │           ├── MarketInvariants.t.sol

│   │           └── VaultInvariants.t.sol

│   └── web/                                      \# Next.js 15

│       └── ...

├── bots/

│   ├── trader/                                   \# Position-taking AI agent

│   ├── oracle-swarm/                             \# 3 resolution agents

│   ├── nansen-watcher/                           \# Smart-money flow alerts

│   ├── shared/

│   └── byreal-skills/

└── docs/

    ├── ARCHITECTURE.md

    ├── DEMO\_SCRIPT.md

    ├── PITCH.md

    └── TEAM\_WORKFLOW.md

---

## 4\. Contracts (Solidity 0.8.26, Foundry, evm\_version=cancun)

### 4.1 `AgentRegistry.sol` (\~200 LoC) — owner: SOLO BUILDER \#1 (lead)

ERC-721 soulbound. Same shape as PayrollVault's AgentRegistry but with extra agent types: 0=Bettor, 1=Trader, 2=OracleNode. Reputation field tracks oracle-vote accuracy.

### 4.2 `MarketFactory.sol` (\~160 LoC) — owner: LEAD

Permissionless market creation with whitelisted question templates.

struct MarketParams {

  string question;            // e.g. "Will BTC close above $150k on 2026-07-01 UTC?"

  uint64 resolutionAt;

  bytes32 alloraTopicId;      // optional — agents can use Allora forecast for this market

  uint8 collateralTier;       // 0=USDT0 only, 1=USDY, 2=sUSDe

  uint16 minStakeBps;         // anti-spam minimum

}

function createMarket(MarketParams calldata) → address market;

### 4.3 `Market.sol` (\~400 LoC) — owner: LEAD \+ SENIOR (paired)

The core. Per-market storage of YES/NO positions, position sizing, share accounting, resolution.

struct Position {

  uint256 agentId;

  uint256 yesShares;

  uint256 noShares;

  uint256 stakedUsdt0;        // for accounting

  uint64  enteredAt;

  bytes32 alloraSnapshot;     // forecast at entry, for "the agent took this position because Allora said X" demo

  bytes32 nansenSnapshot;

}

mapping(address bettor \=\> Position) positions;

External:

- `enter(uint8 outcome, uint256 amount)` — pull USDT0, route to vault, mint shares  
- `exit(uint8 outcome, uint256 shares)` — pre-resolution exit (optional, with fee)  
- `claim()` — post-resolution; pay out winners with principal \+ RWA yield share \+ LP fees  
- `currentPrice() → (uint256 yesPriceE18, uint256 noPriceE18)` — view

Pricing: LMSR (Logarithmic Market Scoring Rule) — proven, judge-friendly.

### 4.4 `CollateralVault.sol` (\~250 LoC) — owner: SOLO BUILDER \#1 (you can lift skeleton from PayrollVault if you build that first; here it's per-market not per-employer)

Per-market USDT0 ⇄ sUSDe/USDY rotation. Different from PayrollVault's vault: this one is single-tenant per market and converts on enter/exit, not on cron.

External (only callable by `Market`):

- `acceptDeposit(uint256 amount, uint8 tier)` — mint vault shares, route to RWA per tier  
- `releaseFor(address recipient, uint256 usdt0Equivalent)` — unwind RWA, send USDT0  
- `vaultValue() → uint256 usdt0Equiv` — view, includes accrued RWA yield

### 4.5 `OracleSwarm.sol` (\~240 LoC) — owner: SENIOR

Three independent ERC-8004 oracle agents resolve each market.

struct Resolution {

  uint256 marketId;

  uint8\[3\] votes;              // 0=YES, 1=NO, 2=INVALID

  uint256\[3\] oracleAgentIds;

  bytes32\[3\] reasoningHashes;  // IPFS of each oracle's reasoning

  bytes\[3\]   signatures;

  uint8 finalOutcome;          // majority

  uint64 finalizedAt;

}

mapping(uint256 marketId \=\> Resolution) resolutions;

External:

- `submitVote(uint256 marketId, uint8 vote, bytes32 reasoningHash, bytes signature)` — only ORACLE\_ROLE; signature verifies the oracle agent signed the tuple  
- `finalize(uint256 marketId)` — anyone after 3 votes received; computes majority; calls `Market.resolve`

Invariants:

1. Cannot vote twice with same oracleAgentId on same marketId  
2. Finalization fails if oracles disagree 1-1-1  
3. Each oracle's reputation in `AgentRegistry` increments on majority-aligned vote, decrements on minority

### 4.6 `AlloraConsumer.sol` (\~120 LoC) — owner: SENIOR

Wraps Allora's on-chain consumer interface. Reads forecasts; verifies attestor signature; surfaces predictions to `Trader` bot via view function.

### 4.7 `DecisionLog.sol` (\~100 LoC) — same as PayrollVault's

---

## 5\. Off-chain components

### 5.1 `bots/trader/src/index.ts` (\~450 LoC) — owner: LEAD

The headline AI surface. For each market the trader is configured to participate in:

1. Pull current LMSR price for YES and NO.  
2. Pull Allora forecast on the market's referenced topic via `AlloraConsumer.getForecast(marketId)`.  
3. Pull Nansen smart-money labels on counterparty addresses (the existing positions).  
4. Call Anthropic claude-haiku-4-5 with structured prompt: *"Given Allora forecast P(YES)=X, current market price P(YES)=Y, smart-money on YES side \= Z addresses, smart-money on NO side \= W addresses, and our risk policy {...}, should we take a position? Output JSON."*  
5. Parse `{action, side, sizeUsdt0, confidence, reasoning}`.  
6. If `action == ENTER`: call `Market.enter(side, sizeUsdt0)`.  
7. Pin reasoning to IPFS; emit Decision via `DecisionLog`.

**Material AI:** the LLM is reading three signals (Allora, Nansen, market price) and producing a non-trivial sizing decision with a reasoning trail. Not "LLM picks a number" — LLM synthesizes three external signals into a reasoned action.

### 5.2 `bots/oracle-swarm/src/index.ts` (\~350 LoC) — owner: SENIOR

Three independent processes (could be three separate keys on the same machine for the demo, but architecturally three independent agents). Each:

1. On market `resolutionAt`, fetch the canonical real-world data (e.g. for "BTC \> $150k", query Coingecko \+ a second source for redundancy).  
2. Independently classify YES/NO/INVALID.  
3. Generate reasoning blob, pin to IPFS.  
4. Sign vote, submit via `OracleSwarm.submitVote`.

In the demo, the three oracle agents have **slightly different data sources** so they sometimes agree 3-0 and sometimes 2-1. The 2-1 case is the Demo Day moment (see §10).

### 5.3 `bots/nansen-watcher/src/index.ts` (\~200 LoC) — owner: LEAD

Polls Nansen for smart-money flows on tokens referenced by active markets. Caches results. Exposes a local HTTP endpoint the trader bot reads from.

### 5.4 `bots/byreal-skills` — 6 skills

| Skill | Purpose | wraps |
| :---- | :---- | :---- |
| `omen-create-market` | Permissionless market creation | `MarketFactory.createMarket` |
| `omen-enter` | Take a YES/NO position | `Market.enter` |
| `omen-trade-ai` | Off-chain: AI trader evaluates and enters | `bots/trader` |
| `omen-vote-oracle` | Cast oracle vote | `OracleSwarm.submitVote` |
| `omen-finalize` | Finalize resolution (anyone) | `OracleSwarm.finalize` |
| `omen-claim` | Post-resolution payout | `Market.claim` |

---

## 6\. Partner integration specs

### 6.1 Allora — primary partner, deepest integration of any concept

**On-chain:** `AlloraConsumer.sol` reads from Allora's mainnet topic via the standard consumer pattern. For demo, use existing topic 14 (ETH/USD price) as the reference for an ETH-related market. Pin the topic ID to the Market on creation; the trader reads it via `getForecast`.

**Off-chain:** `bots/trader/src/allora.ts` queries the REST API for the same topic; uses the on-chain consumer's last-read value as truth; the REST query is a freshness check.

**Allora topic proposal (defer to v2 — do NOT block submission on this):** propose a "binary outcome probability" topic for prediction markets. This is in Allora's roadmap. Mention it in the README as future work.

### 6.2 Nansen

`bots/nansen-watcher` queries `POST /api/v1/wallet/labels` and `POST /api/v1/smart-money/netflow` for tokens the markets reference. Smart-money buying YES side \= signal; smart-money exiting \= signal.

Graceful degrade: returns neutral if no API key.

### 6.3 Byreal Skills CLI

6 skills per §5.4 with proper YAML frontmatter, `requires.env` and `requires.bins`. Each skill calls into the appropriate bot or contract function.

---

## 7\. Frontend (Next.js 15\) — owner: FRONTEND DEV

### 7.1 Design system commitments

This is your team's frontend dev's primary deliverable. The design language is editorial-meets-financial:

- **Display font:** Instrument Serif (CDN)  
- **Body:** Geist (CDN)  
- **Mono:** Geist Mono  
- **Palette:**  
  - Ink `#0F1419`, Paper `#FAF7F2`, Twilight `#1E1B4B`  
  - **Forest** `#1B5E3F` (YES outcome — bound to UX)  
  - **Crimson** `#9B2C2C` (NO outcome)  
  - Terracotta `#C04A2D` (CTA accent)  
  - Ink-mute `#5A6770`, Paper-line `#E5DFD3`  
- **Hero typography:** `clamp(36px, 8vw, 96px)`  
- Mobile-first, 375px min-width tested

### 7.2 Required pages

| Route | Purpose |
| :---- | :---- |
| `/` | Landing — protocol product page |
| `/markets` | List all active markets with current YES/NO prices, volume, resolution time |
| `/markets/[id]` | Single market: question, YES/NO chart, position UI, agent activity feed |
| `/markets/new` | Create market (permissionless) |
| `/agents/registry` | All registered agents with type, win rate, capital deployed |
| `/agents/[id]` | Single agent profile: history, reasoning samples, reputation |
| `/oracle/[id]` | Oracle dashboard: pending markets to vote on (oracle nodes only) |
| `/audit` | DecisionLog event stream |

### 7.3 Critical UX moments (judges remember these)

1. **The agent reasoning panel.** When an AI trader takes a position, the market page shows a card: *"Trader Agent \#42 entered YES at 3:14pm. Allora forecast: 62% YES. Smart money: 4 wallets long. Reasoning: \[scrollable LLM output\]."* This is the Turing-Test moment — judges see the AI thinking.  
     
2. **The oracle swarm resolution.** On `/markets/[id]/resolve`, three oracle cards stream in over 30 seconds, each posting their vote with reasoning. A 2-1 split shows the disagreement. Final outcome is computed live.  
     
3. **The yield bar.** Every market page shows a thin progress bar: "0.42% RWA yield earned by this market's collateral pool so far." Animates up as time passes. This is what no other prediction market on any chain can show.  
     
4. **Mobile-responsive everything.**

### 7.4 Components to build

- `MarketCard` (used on `/markets`)  
- `OutcomeBar` (animated YES/NO LMSR price)  
- `PositionForm` (enter with USDT0, collateral tier picker)  
- `AgentReasoningCard` (the headline component)  
- `OracleSwarmPanel` (three-card live resolution)  
- `YieldBar` (RWA yield ticker)  
- `DecisionStream` (real-time event feed)

---

## 8\. Tests (12 must pass)

Foundry, plus invariant suite.

1. `testCreateMarket_E2E`  
2. `testEnterRoutesToCorrectVaultTier`  
3. `testLMSRPriceMonotonic` (fuzz)  
4. `testOracleSwarm3of3` (unanimous resolution)  
5. `testOracleSwarm2of3` (split decision, majority wins)  
6. `testOracleSwarmAllDifferent_Reverts` (1-1-1 cannot finalize)  
7. `testCannotVoteTwice` (replay protection on oracle)  
8. `testClaimIncludesRWAYield`  
9. `testInvariant_VaultSolvent` (vault always has ≥ owed liabilities)  
10. `testInvariant_LMSRConservation` (sum of YES \+ NO shares × prices \= invariant \+ collateral inflows)  
11. `testAgentReputationOnVote` (oracle reputation updates on majority/minority alignment)  
12. `testEndToEndPredictionMarketLoop` (the headline) — create market → 2 traders enter via AI → time passes (yield accrues) → oracle swarm resolves → winners claim including yield → all events in DecisionLog

---

## 9\. Person-day budget (3-person team)

| Bucket | Lead (PD) | Senior (PD) | Frontend (PD) |
| :---- | :---- | :---- | :---- |
| AgentRegistry \+ MarketFactory | 2 | 0 | — |
| Market.sol (paired) | 3 | 3 | — |
| CollateralVault | 2 | 0 | — |
| OracleSwarm \+ AlloraConsumer | 0 | 4 | — |
| DecisionLog \+ Mocks | 1 | 0 | — |
| Foundry tests \+ invariants | 2 | 2 | — |
| Trader bot \+ Nansen watcher | 4 | 0 | — |
| Oracle swarm bots (×3) | 0 | 3 | — |
| Byreal skills (6) \+ CLI | 1 | 1 | — |
| Frontend design system | — | — | 3 |
| Frontend pages (8 routes) | — | — | 6 |
| Frontend components | — | — | 3 |
| Mobile responsive sweep | — | — | 1 |
| Deploy \+ indexer \+ integration | 1.5 | 1.5 | 1 |
| Demo video \+ README \+ AGENTS.md | 1.5 | 0.5 | 1 |
| Buffer | 2 | 1 | 1 |
| **Total per person** | **20** | **16** | **16** |

**Calendar:** 3 weeks at full pace. Ship target: 2026-06-08 (one week before deadline \= buffer for last-mile fixes).

---

## 10\. Demo script (the 2-minute video — longer than solo because this is more ambitious)

0:00–0:15  Hero: "Prediction markets where capital earns yield while bets are open.

           On Mantle. With autonomous agents."

0:15–0:35  Create market: "Will ETH close above $4500 on 2026-07-15?"

           Pick collateral tier: sUSDe (12% APY).

0:35–0:55  Two human bettors enter. YES at 0.55, NO at 0.45.

           Yield bar starts ticking up.

0:55–1:25  AI trader agent runs (live, on stage).

           AgentReasoningCard shows: Allora forecast 62% YES (high confidence),

           Nansen 3 smart-money wallets long ETH this week,

           market price 0.55 (under-priced vs Allora).

           LLM reasoning: "Edge of 7% with high-confidence forecast.

                          Sizing 1500 USDT0 on YES, capped at 15% of vault."

           Trader enters. Price moves to 0.62.

1:25–1:50  Time skip (UI shows accelerated). Yield bar at 1.2%.

           Resolution time. Three oracle agents fire one by one:

           Oracle A: YES (CoinGecko \+ Binance API).

           Oracle B: YES (Kraken \+ Coinbase).

           Oracle C: INVALID (data source down — shows the swarm handles disagreement).

           Majority: YES (2 of 3 valid).

1:50–2:05  Trader claims. Receives principal \+ LMSR upside \+ 1.2% RWA yield share.

           Show /audit page: 14 Decision events, all on-chain.

2:05–2:10  Closing: "Allora signal. Nansen flow. sUSDe yield. AI judgement.

           Mantle native."

**The single moment that wins:** 0:55–1:25, when the AI trader's reasoning streams in. If it reads as a real reasoning trail, you win the AI×RWA cross-track and the Allora prize. If it reads as a hardcoded message, you collapse to floor.

---

## 11\. Day-by-day plan (ordered to minimize merge conflicts — read §12 first)

### Days 1–3 (parallel)

- **Lead:** AgentRegistry \+ MarketFactory \+ Market skeleton (interfaces only, no logic).  
- **Senior:** OracleSwarm \+ AlloraConsumer \+ Pyth interface.  
- **Frontend:** Next.js scaffold \+ design system \+ landing page \+ `/markets` skeleton with mock data.

Sync at end of Day 3: contracts compile, frontend renders.

### Days 4–7 (parallel)

- **Lead \+ Senior** (paired): Market.sol logic (LMSR, position accounting, resolution hook). This is the hardest contract — pair-program it.  
- **Lead:** CollateralVault \+ tier routing.  
- **Senior:** OracleSwarm voting \+ finalization \+ reputation update.  
- **Frontend:** `/markets/[id]` page with real reads (no writes yet) \+ `MarketCard` \+ `OutcomeBar`.

Sync at end of Day 7: end-to-end happy-path test passes (create → enter → resolve → claim).

### Days 8–11 (parallel)

- **Lead:** Trader bot (the AI surface). Nansen watcher.  
- **Senior:** Oracle swarm bots (three of them) with different data sources.  
- **Frontend:** `PositionForm`, `AgentReasoningCard`, `OracleSwarmPanel`, `YieldBar`. Wire wallet writes for `enter` and `claim`.

Sync at end of Day 11: AI trader takes positions on testnet. Frontend shows real-time agent activity.

### Days 12–14 (parallel)

- **Lead:** Byreal skills (6 manifests \+ CLI). Integration tests.  
- **Senior:** Invariant test suite. Polish OracleSwarm edge cases.  
- **Frontend:** `/audit`, `/agents/[id]`, `/oracle/[id]`. Mobile responsive sweep.

Sync at end of Day 14: full feature set ships.

### Days 15–17 (all)

- Bug bash. Fix everything that broke during integration.  
- README, AGENTS.md, ATTRIBUTION.

### Day 18 (all): demo video. Lead drives, Senior \+ Frontend review.

### Day 19: DoraHacks submission. Sponsor track checkboxes. Public repo. Pitch deck.

### Days 20–21: buffer \+ Twitter thread.

---

## 12\. TEAM\_WORKFLOW.md — how three people don't collide

### File ownership (avoid merge conflicts)

| File | Primary owner | Reviewer |
| :---- | :---- | :---- |
| `AgentRegistry.sol` | Lead | Senior |
| `MarketFactory.sol` | Lead | Senior |
| `Market.sol` | Lead+Senior (paired) | — |
| `CollateralVault.sol` | Lead | Senior |
| `OracleSwarm.sol` | Senior | Lead |
| `AlloraConsumer.sol` | Senior | Lead |
| `DecisionLog.sol` | Lead | — |
| `bots/trader/` | Lead | Senior |
| `bots/oracle-swarm/` | Senior | Lead |
| `bots/nansen-watcher/` | Lead | — |
| `bots/byreal-skills/` | Lead | Senior |
| `apps/web/**` | Frontend | Lead (UX review only) |

### Branching

`main` is protected. Branches:

- `feat/contracts-<area>` — Lead/Senior  
- `feat/bots-<area>` — Lead/Senior  
- `feat/web-<area>` — Frontend

PRs require 1 review. Lead reviews frontend PRs only for content correctness (numbers shown match contract reads).

### Daily 15-min standup

- What I shipped yesterday  
- What I'm shipping today  
- What's blocking me

### Slack channels

- `#omenvault-build` — general  
- `#omenvault-blockers` — escalation only  
- `#omenvault-prs` — auto-pings for PR reviews

### Demo Day rehearsal

- Day 17: full dress rehearsal. All three people present in the recording session.  
- Lead drives the contract demo. Frontend drives the UI demo. Senior narrates oracle swarm.

---

## 13\. Day-1 starter prompt for Claude Code

When the team starts in VS Code Claude Code, the first message after this file is loaded:

Read `OMENVAULT_BUILD_BRIEF.md` end-to-end. Confirm understanding by listing: (1) the seven contracts with LoC budgets and owners from §12, (2) the six Byreal skills, (3) the headline test in §8 \#12 and the headline demo moment in §10. Then begin Day 1 according to §11 — the lead works on AgentRegistry and MarketFactory; do not touch other contracts. Use Solidity 0.8.26, OZ v5.0.2, Foundry. Write contract, write tests, run `forge test`. Report back when Day 1 is complete.

For the senior: *"Begin Day 1 — work on OracleSwarm.sol skeleton and AlloraConsumer.sol. Do NOT modify AgentRegistry or MarketFactory (the lead owns those). Coordinate via the shared interfaces in `src/interfaces/`."*

For the frontend: *"Begin Day 1 — scaffold Next.js 15 App Router with the design system per §7.1. Build the landing page and the `/markets` skeleton with mock data (no contract reads yet — those come Day 4 once the lead's MarketFactory is deployed). All pages must be mobile-responsive from day one."*

---

## 14\. Originality declaration

Every line of contract code is original work by Gwill (@big14way) and team, informed by patterns from prior hackathon winners but not copied. Inspirations include Hubble Trading Arena (ETHGlobal Buenos Aires 2025\) for the multi-agent on-chain trading concept, RACE (HackMoney 2026\) for the prediction-market-meets-RWA framing, and DIVE (Cannes 2026 finalist) for the multi-oracle swarm resolution pattern. **OmenVault's differentiation is the RWA-collateral leg** — yield-while-betting via sUSDe/USDY rotation — which none of those concepts shipped because they were on chains without those primitives. ERC-8004 conformance is read directly from the EIP.

OZ contracts (MIT), Pyth SDK (Apache 2.0), Allora REST/consumer (public), Anthropic SDK (public), Nansen REST (paid). All in `ATTRIBUTION.md`.

This work has not been submitted to any other hackathon.

— End of brief —  
