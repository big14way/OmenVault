# OmenVault — Deployment guide

How to host the live submission stack.

| Surface | Host | Status | URL |
|---|---|---|---|
| Web app | Vercel | ✅ **Live** | https://omenvault.vercel.app |
| Contracts | Mantle Sepolia | ✅ Live since 2026-05-12 | see [README](README.md#live-on-mantle-sepolia-chain-id-5003) |
| Bots (5 services) | Oracle Cloud Always Free **(recommended)** or Railway or Render | ⏳ Pending — pick a path below | — |

---

## Part 1 — Web app on Vercel ✅ DONE

The web app is already live at https://omenvault.vercel.app, configured via the Vercel CLI on 2026-05-24.

**Project setup (reference):**
- Vercel project: `big14ways-projects/omenvault`
- Root Directory: `apps/web`
- Framework: Next.js (auto-detected)
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && pnpm --filter @omenvault/web build`
- Output Directory: `.next`
- Region: `iad1`

**Env vars** (all 11 set on Production environment):

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

To redeploy after a code change:
```bash
git push origin main           # auto-deploy via Vercel ↔ GitHub integration (set up via dashboard)
# OR
vercel --prod --yes            # manual deploy from local
```

---

## Part 2 — Bots: pick a hosting path

The 5 bots are: **trader**, **oracle A/B/C** (3 instances of `oracle-swarm`), **nansen-watcher**, **allora-writer**.

| Option | Cost | Effort | Reliability | Best for |
|---|---|---|---|---|
| **A. Oracle Cloud Always Free** | $0 forever | 45 min | ★★★★★ | Want it truly free, willing to spend setup time |
| **B. Render single Worker** | ~$12 total | 15 min | ★★★★★ | Want polished UX, OK with $7/mo |
| **C. Railway $5 trial** | $0–8 | 15 min | ★★★★ | Fastest path, OK with credit possibly expiring |
| **D. Local machine during judging** | $0 | 0 min | ★★ | Last-resort fallback |

Pick one and follow the section below. All four reuse the same `.env` template — just different hosts running the same `pnpm demo:bots` command.

---

### Option A — Oracle Cloud Always Free (recommended, truly free forever)

You get **4 ARM Ampere cores + 24 GB RAM + 200 GB storage** on one VM, free forever. Massive overhead for our 5 small bots.

**Catches to know upfront:**
1. Credit card required at signup (verification only — Oracle never charges Always-Free resources)
2. ARM Ampere capacity is constrained in popular regions. You may need to try 2-3 regions to provision. **Pick a less-popular home region** (Mexico, Australia, Frankfurt, Singapore) at signup if your default US region fails. The home region is permanent.
3. Idle instances can be reclaimed — our bots polling every 60s easily clear the activity threshold

**Steps:**

1. **Sign up**: https://www.oracle.com/cloud/free/ — pick a less-saturated home region (Frankfurt or Mexico recommended).
2. **Provision an Always Free VM** in the Oracle Cloud Console:
   - Compute → Instances → Create Instance
   - Image: **Ubuntu 24.04** (Always-Free eligible)
   - Shape: **VM.Standard.A1.Flex** with **2 OCPUs / 12 GB RAM** (well within the free 4/24)
   - Add an SSH public key — you'll SSH in
   - Allow ingress on port 80/443 (you'll only expose nansen-watcher behind a reverse proxy later, optional)
   - Create
3. **SSH in** once the VM shows "Running":
   ```bash
   ssh ubuntu@<public-ip>
   ```
4. **Install runtime**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   sudo corepack enable
   ```
5. **Clone repo + install**:
   ```bash
   git clone https://github.com/big14way/OmenVault.git
   cd OmenVault
   pnpm install --frozen-lockfile
   ```
6. **Create `.env` at repo root** with the bot env vars (see [Env vars for bots](#env-vars-for-all-bot-hosts) below).
7. **Install pm2 + start all bots**:
   ```bash
   sudo npm install -g pm2
   pm2 start "pnpm demo:bots" --name omenvault-bots
   pm2 save
   pm2 startup           # follow the command it prints to enable boot-restart
   ```
8. **Verify**: `pm2 logs omenvault-bots` should show all 5 bots' logs interleaved.

That's it. Total cost: $0/forever. The VM keeps running.

---

### Option B — Render single Worker ($7/mo)

Render's Worker tier is the cleanest managed option. **One service runs all 5 bots** via the existing `demo:bots` script.

**Steps:**

1. **Sign up**: https://render.com — no card needed for free tier (Worker tier requires a card).
2. **New +** → **Background Worker** → Connect GitHub → select `big14way/OmenVault`.
3. **Configure:**
   - **Name**: `omenvault-bots`
   - **Region**: Oregon (or closest)
   - **Branch**: `main`
   - **Root Directory**: *leave blank* (monorepo at repo root)
   - **Runtime**: Node
   - **Build Command**: `corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --frozen-lockfile`
   - **Start Command**: `pnpm demo:bots`
   - **Plan**: **Starter ($7/mo)** — 512 MB RAM, 0.5 CPU
4. **Environment** tab → paste all vars from [Env vars for bots](#env-vars-for-all-bot-hosts) below.
5. **Create Background Worker** — first deploy takes ~5 min.
6. **Logs** tab will show all 5 bots interleaved via `concurrently`.

---

### Option C — Railway $5 trial

Railway has the smoothest dashboard but isn't truly free past the trial credit.

Choose between **5 separate services** (my original `DEPLOYMENT.md` recipe — the Procfiles in `bots/*/Procfile` are still there) or **1 collapsed service** like Render's pattern.

**Recommended: 1 collapsed service** (cheaper, simpler):

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → `big14way/OmenVault`
2. Settings:
   - **Root Directory**: `/`
   - **Build Command**: `corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --frozen-lockfile`
   - **Start Command**: `pnpm demo:bots`
3. **Variables** tab → paste all vars from [Env vars for bots](#env-vars-for-all-bot-hosts) below.
4. **Deploy**.

Burn rate at 0.5 CPU / 512 MB / always-on: roughly $4-6/month. The $5 trial credit should cover the full hackathon window if the trial activates on first deploy.

---

### Option D — Local machine

For low-stakes demo periods:

```bash
cp .env.example .env       # then fill in keys
pnpm install
pnpm demo:bots             # boots all 5 bots locally
```

Your machine needs to stay awake + connected. The bots have RPC fallback + unhandledRejection guards so transient network blips won't crash them. Best as a last-resort fallback if your hosted option fails during judging.

---

## Env vars for all bot hosts

These go on whichever host you pick (Oracle Cloud `.env`, Render Environment, Railway Variables, etc.).

### Shared (all 5 bots)

| Key | Value | Notes |
|---|---|---|
| `MANTLE_SEPOLIA_RPC_URL` | `https://rpc.sepolia.mantle.xyz` | |
| `CHAIN_ID` | `5003` | |
| `AGENT_REGISTRY_ADDRESS` | `0x4b6ca7769568f154f3d1bb274d20f5ef9ded3a76` | |
| `MARKET_FACTORY_ADDRESS` | `0xf22f7671529aecfebdca582dc48693b7ad94c1b2` | |
| `ORACLE_SWARM_ADDRESS` | `0x58c9bb07859967be7d10e36a3a329a496f5f9a1e` | |
| `ALLORA_CONSUMER_ADDRESS` | `0xf2d15ca4d4d6c427d304ab78b6806ac90435727f` | |
| `DECISION_LOG_ADDRESS` | `0xf63fbf2279a7c4b7049692441ff0a0f5cde75689` | |
| `USDT0_ADDRESS` | `0xcf0e14b2a482bbedb2edadc8c4814dcfd712857b` | |
| `SUSDE_ADDRESS` | `0x85cf3d6f3d3ef680718cb53b2b6d4b51b341b2a0` | |
| `USDY_ADDRESS` | `0x4059ae416f06214e92f66a544064b529a31689aa` | |
| `PYTH_HERMES_URL` | `https://hermes.pyth.network` | |
| `IPFS_GATEWAY` | `https://gateway.pinata.cloud/ipfs/` | |
| `PINATA_JWT` | *(your Pinata JWT)* | Optional — falls back to deterministic mock CIDs |

### Per-bot wallet keys

You need **5 distinct funded wallets** (≥ 0.1 testnet MNT each). Generate fresh ones (`cast wallet new`) or reuse existing testnet keys.

| Key | Bot | Wallet should be granted |
|---|---|---|
| `TRADER_PRIVATE_KEY` | trader | none specific (just funded) |
| `ORACLE_A_PRIVATE_KEY` | oracle A | ORACLE_ROLE on OracleSwarm |
| `ORACLE_B_PRIVATE_KEY` | oracle B | ORACLE_ROLE on OracleSwarm |
| `ORACLE_C_PRIVATE_KEY` | oracle C | ORACLE_ROLE on OracleSwarm |
| `ATTESTOR_PRIVATE_KEY` | allora-writer | ATTESTOR_ROLE on AlloraConsumer |

Faucet: https://faucet.sepolia.mantle.xyz

### Optional API keys (deeper integration)

| Key | Effect if absent |
|---|---|
| `ANTHROPIC_API_KEY` | Trader falls back to heuristic decision (works, but reasoning is mechanical) |
| `ANTHROPIC_MODEL` | Defaults to `claude-haiku-4-5` |
| `NANSEN_API_KEY` | Watcher falls back to deterministic demo signal |
| `ALLORA_API_BASE` | Writer falls back to CoinGecko 24h momentum → P(YES) |

**All third-party API keys are optional.** Every integration has a dev-mode fallback. For the most impressive demo, set `ANTHROPIC_API_KEY` at minimum (the LLM reasoning is the headline feature).

---

## Part 3 — DoraHacks BUIDL + X thread

Once everything's live, the hackathon submission has two parts:

### DoraHacks BUIDL page

Fill in at https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl:

| Field | What to paste |
|---|---|
| **Name** | OmenVault |
| **One-liner** | RWA-collateralized prediction markets on Mantle with ERC-8004 AI agents that earn yield while bets are open. |
| **Tracks** | AI × RWA (primary) · Agentic Economy (secondary) |
| **Description** | Long version from [README.md](README.md) — problem, solution, Mantle integration, partners, revenue. ~800 words. |
| **GitHub** | https://github.com/big14way/OmenVault |
| **Demo video** | https://youtu.be/tSnD3tq9oSw |
| **Live demo** | https://omenvault.vercel.app |
| **Contract addresses** | All 8 from [README](README.md#live-on-mantle-sepolia-chain-id-5003) |

### X thread (required for #MantleAIHackathon)

See `DEMO.md` §"What to write in the X thread" (local-only) — 4 posts ready to copy-paste, tag `#MantleAIHackathon`, attach the YouTube video to post 1.

---

## Cost summary

| Path | One-time | Monthly | 7-week total |
|---|---|---|---|
| Web (Vercel Hobby) | $0 | $0 | $0 |
| Bots (Oracle Cloud Always Free) | $0 | $0 | **$0** |
| Bots (Render Starter Worker) | $0 | $7 | **~$12** |
| Bots (Railway trial → Hobby) | $0 | $0–6 | **$0–10** |
| Pinata Free tier | $0 | $0 | $0 |
| Anthropic API (estimated) | $0 | ~$1-3 | ~$2-7 |

Most expensive path total: **under $20** for the entire judging window. Cheapest path: **$0** (Oracle Cloud + Anthropic free credits).
