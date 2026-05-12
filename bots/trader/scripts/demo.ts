/**
 * Trader bot demo runner — proves the full AI surface end-to-end against anvil.
 *
 * Flow:
 *   1. Use admin to register the trader as an ERC-8004 Trader agent.
 *   2. Create a sUSDe-collateralized market.
 *   3. Seed an Allora forecast for the market's topic (P(YES)=0.62) — gives the
 *      trader a concrete edge vs the fresh-market 0.5 price.
 *   4. Mint USDT0 to the trader.
 *   5. Run the trader bot once.
 *   6. Print final position + new market price.
 *
 * Run after `forge script Deploy.s.sol --broadcast` against anvil:
 *   cd bots/trader && pnpm demo
 *
 * Optional: set ANTHROPIC_API_KEY for real Claude reasoning. Without it, the
 * heuristic fallback runs the same decision rules and prints a reasoning trail.
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";
import {ethers} from "ethers";
import {abis} from "@omenvault/shared/abis";
import {runTraderOnce} from "../src/index.js";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

const RPC_URL = process.env.RPC_URL ?? process.env.MANTLE_SEPOLIA_RPC_URL ?? "http://localhost:8545";
const ADMIN_PK = process.env.PRIVATE_KEY!;
// Use `||` (not `??`) so an empty-string env var falls through to the default.
const TRADER_PK = process.env.TRADER_PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // anvil acct 1
// Make sure runTraderOnce picks up the trader's key (not admin's, which is what
// PRIVATE_KEY is set to in the smoke .env). cfg() inside index.ts reads this.
process.env.TRADER_PRIVATE_KEY = TRADER_PK;

const ADDRS = {
    usdt0: process.env.USDT0_ADDRESS!,
    registry: process.env.AGENT_REGISTRY_ADDRESS!,
    factory: process.env.MARKET_FACTORY_ADDRESS!,
    alloraConsumer: process.env.ALLORA_CONSUMER_ADDRESS!,
};

function fmtWad(n: bigint): string {
    return (Number(n) / 1e18).toFixed(4);
}
function fmtUsdt0(n: bigint): string {
    return (Number(n) / 1e6).toFixed(2);
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {batchMaxCount: 1});
    const admin = new ethers.Wallet(ADMIN_PK, provider);
    const traderW = new ethers.Wallet(TRADER_PK, provider);

    // Local nonce tracker — same workaround as smoke.ts.
    const nonces = new Map<string, number>();
    async function nextNonce(a: string) {
        if (!nonces.has(a)) nonces.set(a, await provider.getTransactionCount(a, "pending"));
        const n = nonces.get(a)!;
        nonces.set(a, n + 1);
        return n;
    }
    async function send(c: ethers.Contract, method: string, args: any[]) {
        const signer = c.runner as ethers.Wallet;
        const nonce = await nextNonce(await signer.getAddress());
        const tx = await (c as any)[method](...args, {nonce});
        return tx.wait();
    }

    const usdt0 = new ethers.Contract(ADDRS.usdt0, abis.MockUSDT0 as any, admin);
    const registry = new ethers.Contract(ADDRS.registry, abis.AgentRegistry as any, admin);
    const factory = new ethers.Contract(ADDRS.factory, abis.MarketFactory as any, admin);
    const allora = new ethers.Contract(ADDRS.alloraConsumer, abis.AlloraConsumer as any, admin);

    console.log("=== Trader demo ===");
    console.log(`trader address: ${traderW.address}`);

    // 1. Register trader as a Trader agent (idempotent — skip if already registered).
    const existingId: bigint = await registry.tokenIdOf(traderW.address);
    if (existingId === 0n) {
        await send(registry, "register", [1, traderW.address, "ipfs://trader-demo"]);
        console.log("registered trader as ERC-8004 Trader");
    } else {
        console.log(`trader already registered (token #${existingId})`);
    }

    // 2. Create market.
    const block = await provider.getBlock("latest");
    const now = block!.timestamp;
    const topicId = ethers.zeroPadValue(ethers.toBeHex(14), 32);
    const params = {
        question: "Will ETH close above $4500 on 2026-07-15?",
        resolutionAt: now + 60 * 60, // 1h
        alloraTopicId: topicId,
        collateralTier: 2,
        minStakeBps: 0,
        liquidityB: 0n,
    };
    const createRcpt = await send(factory, "createMarket", [params]);
    const marketAddr = createRcpt.logs
        .map((l: any) => {
            try {
                return factory.interface.parseLog(l);
            } catch {
                return null;
            }
        })
        .find((p: any) => p && p.name === "MarketCreated").args.market;
    console.log(`market created at ${marketAddr}`);

    // 3. Seed Allora forecast: P(YES) = 0.62 — gives the trader a 12% edge over fresh price.
    await send(allora, "writeForecast", [topicId, ethers.parseUnits("0.62", 18)]);
    console.log("seeded Allora forecast P(YES)=0.62");

    // 4. Mint USDT0 to trader.
    await send(usdt0, "mint", [traderW.address, 10_000_000_000n]);
    console.log(`funded trader with $${fmtUsdt0(10_000_000_000n)} USDT0`);

    // 5. Run trader.
    const result = await runTraderOnce({marketAddr});

    // 6. Final state.
    console.log("\n=== Post-trade ===");
    const market = new ethers.Contract(marketAddr, abis.Market as any, provider);
    const [pY, pN] = await market.currentPrice();
    console.log(`market price: YES=${fmtWad(pY)}  NO=${fmtWad(pN)}`);
    if (result.txHash) {
        console.log(`tx: ${result.txHash}`);
        console.log(`shares minted (wad): ${fmtWad(result.sharesMintedWad ?? 0n)}`);
    } else {
        console.log("(trader chose to PASS — no entry submitted)");
    }
    const usdt0R = new ethers.Contract(ADDRS.usdt0, abis.MockUSDT0 as any, provider);
    const traderBal: bigint = await usdt0R.balanceOf(traderW.address);
    console.log(`trader USDT0 balance: $${fmtUsdt0(traderBal)}`);
}

main().catch((err) => {
    console.error("demo failed:", err);
    process.exit(1);
});
