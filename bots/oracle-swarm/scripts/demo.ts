/**
 * Oracle swarm demo runner — proves the full 3-agent resolution flow end-to-end.
 *
 * Flow:
 *   1. Register three oracle agents (anvil accts 3, 4, 5) as ERC-8004 OracleNodes.
 *   2. Grant ORACLE_ROLE to each on the OracleSwarm.
 *   3. Create a market with a known-true question ("Will ETH close above $1?")
 *      and a 60-second resolution window.
 *   4. Skip time forward past resolutionAt.
 *   5. Run voteOnce for each oracle (A, B, C). Each pulls real ETH/USD prices
 *      from its assigned data sources and votes YES/NO/INVALID.
 *   6. Call OracleSwarm.finalize → propagates outcome to Market.
 *   7. Print the resolution + reputation deltas.
 *
 * Requires anvil running with the deployed addresses in .env. Internet required
 * for the data sources.
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";
import {ethers} from "ethers";
import {abis} from "@omenvault/shared/abis";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

const RPC_URL = process.env.RPC_URL ?? process.env.MANTLE_SEPOLIA_RPC_URL ?? "http://localhost:8545";
const ADMIN_PK = process.env.PRIVATE_KEY!;

// Anvil deterministic accts 3, 4, 5 — one per oracle.
const ORACLE_KEYS = {
    A: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    B: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    C: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
} as const;

const ADDRS = {
    registry: process.env.AGENT_REGISTRY_ADDRESS!,
    factory: process.env.MARKET_FACTORY_ADDRESS!,
    swarm: process.env.ORACLE_SWARM_ADDRESS!,
};

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {batchMaxCount: 1});
    const admin = new ethers.Wallet(ADMIN_PK, provider);

    const nonces = new Map<string, number>();
    async function nextNonce(a: string) {
        if (!nonces.has(a)) nonces.set(a, await provider.getTransactionCount(a, "pending"));
        const n = nonces.get(a)!;
        nonces.set(a, n + 1);
        return n;
    }
    async function send(c: ethers.Contract, method: string, args: any[]) {
        const signer = c.runner as ethers.Wallet;
        const a = await signer.getAddress();
        const tx = await (c as any)[method](...args, {nonce: await nextNonce(a)});
        return tx.wait();
    }

    const registry = new ethers.Contract(ADDRS.registry, abis.AgentRegistry as any, admin);
    const factory = new ethers.Contract(ADDRS.factory, abis.MarketFactory as any, admin);
    const swarm = new ethers.Contract(ADDRS.swarm, abis.OracleSwarm as any, admin);

    const oracleWallets = (Object.entries(ORACLE_KEYS) as [keyof typeof ORACLE_KEYS, string][]).map(
        ([id, pk]) => ({id, w: new ethers.Wallet(pk, provider)}),
    );

    console.log("=== Oracle swarm demo ===");

    // 1. Register oracle agents (idempotent).
    for (const o of oracleWallets) {
        const id: bigint = await registry.tokenIdOf(o.w.address);
        if (id === 0n) {
            await send(registry, "register", [2, o.w.address, `ipfs://oracle-${o.id}`]);
            console.log(`registered oracle-${o.id} as ERC-8004 OracleNode`);
        } else {
            console.log(`oracle-${o.id} already registered (token #${id})`);
        }
    }

    // 2. Grant ORACLE_ROLE.
    const ORACLE_ROLE = await swarm.ORACLE_ROLE();
    for (const o of oracleWallets) {
        const has: boolean = await swarm.hasRole(ORACLE_ROLE, o.w.address);
        if (!has) {
            await send(swarm, "grantRole", [ORACLE_ROLE, o.w.address]);
            console.log(`granted ORACLE_ROLE to oracle-${o.id}`);
        }
    }

    // 3. Create a known-true market. Resolution well in the future — we time-warp later.
    const block = await provider.getBlock("latest");
    const now = block!.timestamp;
    console.log(`anvil time: ${now} (wallclock ${Math.floor(Date.now() / 1000)})`);
    const params = {
        question: "Will ETH close above $1 on resolution?",
        resolutionAt: now + 3600, // 1 hour buffer; we evm_increaseTime past it later
        alloraTopicId: ethers.zeroPadValue(ethers.toBeHex(14), 32),
        collateralTier: 0,
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
    console.log(`market created at ${marketAddr}: "${params.question}"`);

    // 4. Skip past resolutionAt (jump 2 hours).
    await provider.send("evm_increaseTime", [7200]);
    await provider.send("evm_mine", []);
    console.log("time-warped 2h past resolutionAt");

    // 5. Run each oracle. Set ORACLE env var for the imported voteOnce to read.
    const {voteOnce, VoteName} = await import("../src/index.js");
    const results: Record<string, {vote: number; tx?: string}> = {};
    for (const o of oracleWallets) {
        process.env.ORACLE = o.id;
        process.env[`ORACLE_${o.id}_PRIVATE_KEY`] = ORACLE_KEYS[o.id];
        try {
            const r = await voteOnce({marketAddr});
            results[o.id] = {vote: r.vote, tx: r.txHash};
        } catch (e: any) {
            console.error(`oracle-${o.id} error:`, e.shortMessage ?? e.message);
            results[o.id] = {vote: 2}; // INVALID on error so finalize can still see 3 votes
        }
    }

    // 6. Finalize.
    console.log("\n=== Finalizing ===");
    try {
        await send(swarm, "finalize", [marketAddr]);
    } catch (e: any) {
        console.error("finalize error:", e.shortMessage ?? e.message);
        return;
    }

    // 7. Read final outcome + reputation.
    const market = new ethers.Contract(marketAddr, abis.Market as any, provider);
    const outcome: bigint = await market.outcome();
    const outName = ["UNRESOLVED", "YES", "NO", "INVALID"][Number(outcome)];
    console.log(`market outcome: ${outName}`);

    console.log("\n=== Oracle reputation ===");
    for (const o of oracleWallets) {
        const id: bigint = await registry.tokenIdOf(o.w.address);
        const agent = await registry.agents(id);
        const voteName = VoteName[results[o.id].vote as 0 | 1 | 2];
        console.log(`  oracle-${o.id} (#${id}): voted ${voteName}, reputation=${agent.reputation}`);
    }
}

main().catch((err) => {
    console.error("demo failed:", err);
    process.exit(1);
});
