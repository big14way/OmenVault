# OmenVault — Deployment guide

How to ship the live submission stack: **Next.js web → Vercel**, **5 long-running bots → Railway**, **contracts already live on Mantle Sepolia**.

The target end-state for the hackathon submission:

| Surface | Host | URL |
|---|---|---|
| Web app | Vercel | https://omenvault.vercel.app |
| Trader bot | Railway | (worker — no public URL) |
| Oracle A · B · C | Railway (3 services) | (workers — no public URLs) |
| Allora writer | Railway | (worker) |
| Nansen watcher | Railway | `https://omenvault-nansen.up.railway.app/signal?token=…` |
| Contracts | Mantle Sepolia | already deployed — see [README](README.md#live-on-mantle-sepolia-chain-id-5003) |

---

## Part 1 — Web app to Vercel

### Prereqs
- A Vercel account linked to the GitHub repo `big14way/OmenVault`.
- `vercel` CLI installed locally (optional, but speeds first deploy): `npm i -g vercel`.

### Steps

1. **Connect the repo on vercel.com**
   - "Add New… → Project" → import `big14way/OmenVault`.
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** `apps/web`.
   - **Build Command:** *leave default* — `vercel.json` overrides it to run pnpm install at the monorepo root first.
   - **Install Command:** *leave blank* — `vercel.json` handles it.
   - **Output Directory:** `.next` (auto).

2. **Environment Variables** (Vercel dashboard → Project → Settings → Environment Variables)

   Copy these into Vercel for **Production, Preview, and Development** environments:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_CHAIN_ID` | `5003` |
   | `NEXT_PUBLIC_RPC_URL` | `https://rpc.sepolia.mantle.xyz` |
   | `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS` | `0x4b6ca7769568f154f3d1bb274d20f5ef9ded3a76` |
   | `NEXT_PUBLIC_MARKET_FACTORY_ADDRESS` | `0xf22f7671529aecfebdca582dc48693b7ad94c1b2` |
   | `NEXT_PUBLIC_ORACLE_SWARM_ADDRESS` | `0x58c9bb07859967be7d10e36a3a329a496f5f9a1e` |
   | `NEXT_PUBLIC_ALLORA_CONSUMER_ADDRESS` | `0xf2d15ca4d4d6c427d304ab78b6806ac90435727f` |
   | `NEXT_PUBLIC_DECISION_LOG_ADDRESS` | `0xf63fbf2279a7c4b7049692441ff0a0f5cde75689` |
   | `NEXT_PUBLIC_USDT0_ADDRESS` | `0xcf0e14b2a482bbedb2edadc8c4814dcfd712857b` |
   | `NEXT_PUBLIC_SUSDE_ADDRESS` | `0x85cf3d6f3d3ef680718cb53b2b6d4b51b341b2a0` |
   | `NEXT_PUBLIC_USDY_ADDRESS` | `0x4059ae416f06214e92f66a544064b529a31689aa` |
   | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `1eebe528ca0ce94a99ceaa2e915058d7` |
   | `NEXT_PUBLIC_NANSEN_WATCHER_URL` *(optional)* | `https://omenvault-nansen.up.railway.app` — fill after Railway deploy |

3. **Deploy** — click "Deploy". First build takes 3–4 min (cold install of pnpm workspace).

4. **Set custom domain** (optional)
   - Project → Settings → Domains → add `omenvault.app` if you have a domain, or leave on the `*.vercel.app` subdomain.

5. **Smoke-test the live URL**
   - Open https://omenvault.vercel.app
   - Connect wallet (MetaMask or WalletConnect-QR with a mobile wallet) → confirm Mantle Sepolia.
   - Navigate `/markets` — should list the seeded markets.
   - Open one market — `OutcomeBar`, `YieldBar`, `AgentReasoningCard` should all render.

### Notes on the monorepo build
- `vercel.json` at the repo root forces install/build from the root so pnpm's workspace symlinks resolve correctly.
- If Vercel auto-detects `apps/web/package.json` and tries to install there, the `apps/web/vercel.json` override re-anchors install to the root.
- TypeScript build is verified clean: `pnpm --filter @omenvault/web typecheck` passes locally.

---

## Part 2 — Bots to Railway

Each bot is a separate Railway **service** in one Railway **project**. They share the same env-var set for chain config but each gets its own private key.

### Prereqs
- A Railway account: https://railway.app
- The GitHub repo connected to Railway: New Project → "Deploy from GitHub repo" → `big14way/OmenVault`.

### One-time project setup

1. Create the project from the GitHub repo.
2. **At the project level** (not service-level), set these "Shared Variables":

   | Key | Value |
   |---|---|
   | `MANTLE_SEPOLIA_RPC_URL` | `https://rpc.sepolia.mantle.xyz` |
   | `CHAIN_ID` | `5003` |
   | `AGENT_REGISTRY_ADDRESS` | `0x4b6ca7769568f154f3d1bb274d20f5ef9ded3a76` |
   | `MARKET_FACTORY_ADDRESS` | `0xf22f7671529aecfebdca582dc48693b7ad94c1b2` |
   | `ORACLE_SWARM_ADDRESS` | `0x58c9bb07859967be7d10e36a3a329a496f5f9a1e` |
   | `ALLORA_CONSUMER_ADDRESS` | `0xf2d15ca4d4d6c427d304ab78b6806ac90435727f` |
   | `DECISION_LOG_ADDRESS` | `0xf63fbf2279a7c4b7049692441ff0a0f5cde75689` |
   | `USDT0_ADDRESS` | `0xcf0e14b2a482bbedb2edadc8c4814dcfd712857b` |
   | `SUSDE_ADDRESS` | `0x85cf3d6f3d3ef680718cb53b2b6d4b51b341b2a0` |
   | `USDY_ADDRESS` | `0x4059ae416f06214e92f66a544064b529a31689aa` |
   | `PYTH_HERMES_URL` | `https://hermes.pyth.network` |
   | `PINATA_JWT` | *(your Pinata JWT — falls back to deterministic mock CIDs if absent)* |
   | `IPFS_GATEWAY` | `https://gateway.pinata.cloud/ipfs/` |

### Per-service config

For each of the 5 bots below, do: **New Service → Deploy from GitHub repo → Configure**:

1. **Service name** as listed.
2. **Root Directory:** repo root (`/`).
3. **Build Command:** `corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --frozen-lockfile`
4. **Start Command:** as listed below (also matches the `Procfile` in each bot folder).
5. **Service-level env vars** as listed.

#### Service 1 — `omenvault-trader`

- **Start:** `pnpm --filter @omenvault/trader start`
- **Env:**
  | Key | Value |
  |---|---|
  | `TRADER_PRIVATE_KEY` | `0x…` *(distinct from oracle keys; fund with ≥ 0.1 testnet MNT)* |
  | `ANTHROPIC_API_KEY` | `sk-ant-…` — **required** for real LLM reasoning |
  | `ANTHROPIC_MODEL` | `claude-haiku-4-5` |
  | `NANSEN_WATCHER_URL` | `https://omenvault-nansen.up.railway.app` *(from Service 5)* |
  | `ALLORA_STALENESS_SEC` | `900` |

#### Service 2 — `omenvault-oracle-a`

- **Start:** `pnpm --filter @omenvault/oracle-swarm start`
- **Env:**
  | Key | Value |
  |---|---|
  | `ORACLE` | `A` |
  | `ORACLE_A_PRIVATE_KEY` | `0x…` |

#### Service 3 — `omenvault-oracle-b`

- **Start:** `pnpm --filter @omenvault/oracle-swarm start`
- **Env:**
  | Key | Value |
  |---|---|
  | `ORACLE` | `B` |
  | `ORACLE_B_PRIVATE_KEY` | `0x…` |

#### Service 4 — `omenvault-oracle-c`

- **Start:** `pnpm --filter @omenvault/oracle-swarm start`
- **Env:**
  | Key | Value |
  |---|---|
  | `ORACLE` | `C` |
  | `ORACLE_C_PRIVATE_KEY` | `0x…` |

#### Service 5 — `omenvault-nansen` *(public HTTP)*

- **Start:** `pnpm --filter @omenvault/nansen-watcher start`
- **Env:**
  | Key | Value |
  |---|---|
  | `NANSEN_API_KEY` | *(your Nansen key — falls back to deterministic demo signal if absent)* |
  | `NANSEN_API_BASE` | `https://api.nansen.ai/v1` |
  | `NANSEN_WATCHER_PORT` | `${{PORT}}` *(use Railway's injected PORT)* |
  | `NANSEN_POLL_INTERVAL_SEC` | `60` |
- **Networking:** in service Settings → Networking → "Generate Domain" so the trader and frontend can reach it.

#### Service 6 — `omenvault-allora-writer`

- **Start:** `pnpm --filter @omenvault/allora-writer start`
- **Env:**
  | Key | Value |
  |---|---|
  | `ATTESTOR_PRIVATE_KEY` | `0x…` *(the AlloraConsumer attestor — granted ATTESTOR_ROLE at deploy)* |
  | `ALLORA_API_BASE` | *(optional; falls back to CoinGecko momentum if absent)* |
  | `ALLORA_TOPICS` | `14,1,8` |
  | `ALLORA_POLL_INTERVAL_SEC` | `60` |

### Funding the bot wallets

All four signing keys (trader + 3 oracles + attestor) need testnet MNT for gas:

```bash
# from a funded wallet, send 0.1 MNT each to:
# - TRADER_PRIVATE_KEY's address
# - ORACLE_A_PRIVATE_KEY's address
# - ORACLE_B_PRIVATE_KEY's address
# - ORACLE_C_PRIVATE_KEY's address
# - ATTESTOR_PRIVATE_KEY's address
```

Mantle Sepolia faucet: https://faucet.sepolia.mantle.xyz

### Verifying the bots are alive

After deploying, check Railway's per-service log tab:

- **Trader:** should print `[trader] Auto-discovering open markets…` every cycle.
- **Oracle A/B/C:** should print `[oracle-A] No markets ready to vote — sleeping`.
- **Allora writer:** should print `[allora] Wrote topic 14 valueE18=…  tx 0x…`.
- **Nansen watcher:** the public URL should respond with JSON to `GET /signal?token=0xcf0e14b2a482bbedb2edadc8c4814dcfd712857b`.

If any service is crash-looping, it's almost always one of: missing env var, unfunded wallet, or trying to call a contract address that doesn't match the env config — check the first 50 log lines.

---

## Part 3 — Update README + DoraHacks BUIDL after deploy

Once the Vercel URL resolves:

1. **README.md** — the `omenvault.vercel.app` badge and "Live app" link already point there; no changes needed unless you use a custom domain.
2. **DoraHacks BUIDL page** — fill in:
   - **Demo video:** https://youtu.be/tSnD3tq9oSw
   - **Live demo:** the Vercel URL
   - **GitHub:** https://github.com/big14way/OmenVault
   - **Contract addresses:** the 8 from [README](README.md)
3. **X thread** with `#MantleAIHackathon` — paste the four posts from `DEMO.md` §"What to write in the X thread" (local-only doc).

---

## Cost summary (typical)

| Service | Plan | Monthly |
|---|---|---|
| Vercel (Hobby) | Free | $0 |
| Railway — 6 services on Free credits | Free $5/month credit | ~$0 for the first month while burning credits |
| Pinata | Free tier (1 GB) | $0 |
| Anthropic | Pay-as-you-go | ~$0.50 per 1000 trader cycles at Haiku rates |
| Nansen | Free tier or paid | $0 if using demo-mode fallback |

Total to keep the live demo running for the hackathon judging window: **under $5**.
