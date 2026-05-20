/**
 * Demo seed — minimal pre-demo state setup. Idempotent enough to re-run
 * between rehearsals.
 *
 * Flow:
 *   1. Create a near-future market (resolution 8 minutes out by default; tunable
 *      via DEMO_RESOLUTION_MINUTES env). The window is short enough that
 *      judges see the oracle swarm fire during the demo, long enough to enter
 *      a few positions on chain first.
 *   2. Mint USDT0 to demo wallets (DEMO_WALLETS=<comma-separated addresses>;
 *      defaults to the deployer + the trader wallet derived from
 *      TRADER_PRIVATE_KEY). Idempotent — skips if balance already >= target.
 *   3. Print a one-screen summary: market address, resolution countdown,
 *      explorer links, and the bot commands to start.
 *
 * Usage:
 *   pnpm -F @omenvault/shared demo:seed
 *   DEMO_RESOLUTION_MINUTES=15 pnpm -F @omenvault/shared demo:seed
 *   DEMO_QUESTION="Will ETH close above $5000 by EOD?" pnpm -F @omenvault/shared demo:seed
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";
import {ethers} from "ethers";
import {abis} from "../src/abis/index.js";
import {provider as resilientProvider} from "../src/rpc.js";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

const ADMIN_PK = process.env.PRIVATE_KEY!;
const TRADER_PK = process.env.TRADER_PRIVATE_KEY;

const ADDRS = {
    usdt0: process.env.USDT0_ADDRESS!,
    factory: process.env.MARKET_FACTORY_ADDRESS!,
};

const RESOLUTION_MINUTES = Number(process.env.DEMO_RESOLUTION_MINUTES ?? 8);
const DEMO_QUESTION =
    process.env.DEMO_QUESTION ?? `Will ETH close above $4500 on ${new Date().toISOString().slice(0, 10)}?`;
const DEMO_TOPIC = Number(process.env.DEMO_TOPIC_ID ?? 14);
const DEMO_COLLATERAL_TIER = Number(process.env.DEMO_COLLATERAL_TIER ?? 2); // 2=sUSDe
const TARGET_USDT0_PER_WALLET = BigInt(process.env.DEMO_USDT0_AMOUNT ?? 10_000_000_000); // 10k USDT0 (6 decimals)

function header(s: string) {
    console.log(`\n=== ${s} ===`);
}

function fmtUsdt0(n: bigint): string {
    return (Number(n) / 1e6).toFixed(2);
}

function fmtDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
}

async function main() {
    for (const [k, v] of Object.entries(ADDRS)) {
        if (!v) throw new Error(`Missing address: ${k.toUpperCase()}_ADDRESS — deploy first`);
    }
    if (!ADMIN_PK) throw new Error("PRIVATE_KEY not set");

    const provider = resilientProvider();
    const admin = new ethers.Wallet(ADMIN_PK, provider);
    const adminAddr = await admin.getAddress();
    console.log(`demo-seed: admin=${adminAddr}`);

    const usdt0 = new ethers.Contract(ADDRS.usdt0, abis.MockUSDT0 as any, admin);
    const factory = new ethers.Contract(ADDRS.factory, abis.MarketFactory as any, admin);

    // Per-address nonce tracking so back-to-back sends don't race.
    const nonces = new Map<string, number>();
    async function nextNonce(addr: string): Promise<number> {
        if (!nonces.has(addr)) nonces.set(addr, await provider.getTransactionCount(addr, "pending"));
        const n = nonces.get(addr)!;
        nonces.set(addr, n + 1);
        return n;
    }

    header(`1. create market (resolves in ${RESOLUTION_MINUTES}m)`);
    const block = await provider.getBlock("latest");
    const now = block!.timestamp;
    const params = {
        question: DEMO_QUESTION,
        resolutionAt: now + RESOLUTION_MINUTES * 60,
        alloraTopicId: ethers.zeroPadValue(ethers.toBeHex(DEMO_TOPIC), 32),
        collateralTier: DEMO_COLLATERAL_TIER,
        minStakeBps: 0,
        liquidityB: 0n,
    };
    const createTx = await factory.createMarket(params, {nonce: await nextNonce(adminAddr)});
    const createRcpt = await createTx.wait();
    const newLen: bigint = await factory.marketsLength();
    const marketAddr: string = await factory.allMarkets(newLen - 1n);
    console.log(`market: ${marketAddr}`);
    console.log(`question: "${DEMO_QUESTION}"`);
    console.log(`resolves at: ${new Date(params.resolutionAt * 1000).toISOString()} (in ${fmtDuration(RESOLUTION_MINUTES * 60)})`);
    console.log(`tx: ${createRcpt?.hash}`);

    header("2. faucet USDT0 to demo wallets");
    // Resolve wallet list. Defaults to admin + trader if both present.
    const walletList = (process.env.DEMO_WALLETS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => ethers.isAddress(s));
    if (walletList.length === 0) {
        walletList.push(adminAddr);
        if (TRADER_PK) walletList.push(new ethers.Wallet(TRADER_PK).address);
    }
    for (const w of walletList) {
        const bal: bigint = await usdt0.balanceOf(w);
        if (bal >= TARGET_USDT0_PER_WALLET) {
            console.log(`  ${w.slice(0, 10)}… already has ${fmtUsdt0(bal)} USDT0 — skip`);
            continue;
        }
        const delta = TARGET_USDT0_PER_WALLET - bal;
        const tx = await usdt0.mint(w, delta, {nonce: await nextNonce(adminAddr)});
        await tx.wait();
        console.log(`  minted ${fmtUsdt0(delta)} USDT0 to ${w.slice(0, 10)}… (tx ${tx.hash.slice(0, 12)}…)`);
    }

    header("ready");
    console.log(`market URL: /markets/${marketAddr}`);
    console.log(`audit URL:  /audit`);
    console.log(`swarm URL:  /swarm`);
    console.log(`explorer:   https://explorer.sepolia.mantle.xyz/address/${marketAddr}`);
    console.log("");
    console.log("Now start the bots in separate terminals:");
    console.log("  pnpm -F @omenvault/nansen-watcher start    # local Nansen signal cache");
    console.log("  pnpm -F @omenvault/allora-writer start     # writes Allora forecast on chain");
    console.log("  pnpm -F @omenvault/trader start            # AI trader takes a position");
    console.log("  ORACLE=A pnpm -F @omenvault/oracle-swarm start");
    console.log("  ORACLE=B pnpm -F @omenvault/oracle-swarm start");
    console.log("  ORACLE=C pnpm -F @omenvault/oracle-swarm start");
    console.log("");
    console.log(`Re-run this script for a fresh market after the demo. DEMO_RESOLUTION_MINUTES, ` +
        `DEMO_QUESTION, and DEMO_WALLETS env vars are honored.`);
}

main().catch((err) => {
    console.error("demo-seed: fatal:", err);
    process.exit(1);
});
