/**
 * End-to-end smoke test against a live RPC (anvil or Mantle Sepolia).
 *
 * Flow:
 *   1. Connect to RPC, load deployed addresses from env.
 *   2. Register a Trader agent (alice) and 3 OracleNode agents.
 *   3. Create a market.
 *   4. Mint USDT0 to alice + bob, both enter on opposite sides.
 *   5. Time-warp (anvil only) so RWA yield accrues.
 *   6. Three oracles each submit a signed vote.
 *   7. finalize() → market.resolve() called automatically.
 *   8. Alice (winner) claims, prints payout.
 *
 * Required env (from .env at repo root):
 *   - MANTLE_SEPOLIA_RPC_URL (or RPC_URL)
 *   - PRIVATE_KEY (admin / deployer)
 *   - All NEXT_PUBLIC_* address vars filled in by Deploy.s.sol
 *
 * Usage (after `forge script Deploy.s.sol --broadcast`):
 *   pnpm --filter @omenvault/shared smoke
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import {ethers} from "ethers";
import {abis} from "../src/abis/index.js";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: resolve(__dirname_, "../../../.env"), override: true});

const RPC_URL = process.env.RPC_URL ?? process.env.MANTLE_SEPOLIA_RPC_URL ?? "http://localhost:8545";
const ADMIN_PK = process.env.PRIVATE_KEY!;

// Anvil deterministic accounts (test test test ... junk).
const ALICE_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const BOB_PK = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const ORACLE_A_PK = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const ORACLE_B_PK = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";
const ORACLE_C_PK = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba";

const ADDRS = {
    usdt0: process.env.USDT0_ADDRESS!,
    registry: process.env.AGENT_REGISTRY_ADDRESS!,
    factory: process.env.MARKET_FACTORY_ADDRESS!,
    swarm: process.env.ORACLE_SWARM_ADDRESS!,
    decisionLog: process.env.DECISION_LOG_ADDRESS!,
};

function header(s: string) {
    console.log(`\n=== ${s} ===`);
}

function fmtUsdt0(n: bigint): string {
    return (Number(n) / 1e6).toFixed(2);
}

function fmtWad(n: bigint): string {
    return (Number(n) / 1e18).toFixed(4);
}

async function main() {
    console.log(`smoke: RPC=${RPC_URL}`);
    for (const [k, v] of Object.entries(ADDRS)) {
        if (!v) throw new Error(`Missing env var for address: ${k.toUpperCase()}_ADDRESS — run forge script Deploy.s.sol first`);
    }

    // batchMaxCount=1 disables JSON-RPC batching. Default 100ms batching can race
    // eth_getTransactionCount against the previous tx's mining on anvil, producing
    // stale-nonce errors on rapid sequential awaited sends.
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {batchMaxCount: 1});
    provider.pollingInterval = 50;
    const adminW = new ethers.Wallet(ADMIN_PK, provider);
    const aliceW = new ethers.Wallet(ALICE_PK, provider);
    const bobW = new ethers.Wallet(BOB_PK, provider);
    const oracleAW = new ethers.Wallet(ORACLE_A_PK, provider);
    const oracleBW = new ethers.Wallet(ORACLE_B_PK, provider);
    const oracleCW = new ethers.Wallet(ORACLE_C_PK, provider);
    const admin = adminW;
    const alice = aliceW;
    const bob = bobW;
    const oracleA = oracleAW;
    const oracleB = oracleBW;
    const oracleC = oracleCW;

    // Helper: fetch nonce fresh from the chain, then send. Works around an ethers v6 +
    // anvil interaction where the cached "pending" nonce can lag the actual chain state.
    // Client-side nonce tracking. Anvil's getTransactionCount("pending") lags by one block
    // after tx.wait() resolves, so we maintain our own per-address counter seeded from the chain.
    const nonces = new Map<string, number>();
    async function nextNonce(addr: string): Promise<number> {
        if (!nonces.has(addr)) {
            nonces.set(addr, await provider.getTransactionCount(addr, "pending"));
        }
        const n = nonces.get(addr)!;
        nonces.set(addr, n + 1);
        return n;
    }
    async function send(c: ethers.Contract, method: string, args: any[], extra: any = {}) {
        const signer = (c.runner as ethers.Wallet);
        const nonce = await nextNonce(signer.address);
        if (process.env.SMOKE_DEBUG) console.log(`[send] ${method} from=${signer.address.slice(0,10)} nonce=${nonce}`);
        const tx = await (c as any)[method](...args, {nonce, ...extra});
        return tx.wait();
    }

    const usdt0 = new ethers.Contract(ADDRS.usdt0, abis.MockUSDT0 as any, admin);
    const registry = new ethers.Contract(ADDRS.registry, abis.AgentRegistry as any, admin);
    const factory = new ethers.Contract(ADDRS.factory, abis.MarketFactory as any, admin);
    const swarm = new ethers.Contract(ADDRS.swarm, abis.OracleSwarm as any, admin);

    // Top up test wallets with gas on testnet (no-op on anvil where they already have ETH).
    if (!RPC_URL.includes("localhost")) {
        header("0. fund test wallets with gas");
        // Tier-2 enter (USDT0->USDe->sUSDe) burns ~4M gas at 100 gwei = ~0.4 MNT.
        // Budget 0.5 MNT per wallet so alice/bob can each do multiple txs.
        const TOPUP = ethers.parseEther("0.5");
        const MIN_KEEP = ethers.parseEther("0.4");
        for (const w of [aliceW, bobW, oracleAW, oracleBW, oracleCW]) {
            const bal = await provider.getBalance(w.address);
            if (bal < MIN_KEEP) {
                const nonce = await nextNonce(adminW.address);
                const tx = await adminW.sendTransaction({to: w.address, value: TOPUP, nonce});
                await tx.wait();
                console.log(`funded ${w.address.slice(0, 10)} with 0.5 MNT`);
            }
        }
    }

    header("1. register agents");
    // Idempotent — skip any wallet already in the registry (smoke is rerun-friendly on testnet).
    const registrations: [number, ethers.Wallet, string][] = [
        [1, aliceW, "ipfs://alice"],       // Trader
        [0, bobW, "ipfs://bob"],           // Bettor
        [2, oracleAW, "ipfs://oracleA"],   // OracleNode
        [2, oracleBW, "ipfs://oracleB"],
        [2, oracleCW, "ipfs://oracleC"],
    ];
    for (const [kind, w, uri] of registrations) {
        const existing: bigint = await registry.tokenIdOf(w.address);
        if (existing === 0n) {
            await send(registry, "register", [kind, w.address, uri]);
        }
    }

    // Grant ORACLE_ROLE to each oracle wallet (idempotent — hasRole check).
    const ORACLE_ROLE = await swarm.ORACLE_ROLE();
    for (const w of [oracleAW, oracleBW, oracleCW]) {
        const has: boolean = await swarm.hasRole(ORACLE_ROLE, w.address);
        if (!has) {
            await send(swarm, "grantRole", [ORACLE_ROLE, w.address]);
        }
    }
    console.log(`registered: alice=${aliceW.address.slice(0, 8)}, bob=${bobW.address.slice(0, 8)}, 3 oracles`);

    header("2. create market");
    const block = await provider.getBlock("latest");
    const now = block!.timestamp;
    // Testnet txs land slowly; give the smoke flow room to enter before resolutionAt passes.
    // Anvil time-warps later so the value barely matters there.
    const isLocal = RPC_URL.includes("localhost");
    const resolutionOffset = isLocal ? 60 : 24 * 3600; // 1 day on testnet so the market stays open
    const params = {
        question: "Will ETH close above $4500 on 2026-07-15?",
        resolutionAt: now + resolutionOffset,
        alloraTopicId: ethers.zeroPadValue(ethers.toBeHex(14), 32),
        collateralTier: 2, // sUSDe ~12% APY
        minStakeBps: 0,
        liquidityB: 0n,
    };
    await send(factory, "createMarket", [params]);
    // Read the address directly from the factory — receipt-log parsing can be
    // brittle across RPC providers on Mantle Sepolia.
    const newLen: bigint = await factory.marketsLength();
    const marketAddr: string = await factory.allMarkets(newLen - 1n);
    console.log(`market deployed at ${marketAddr}`);

    const market = new ethers.Contract(marketAddr, abis.Market as any, admin);
    const collateralVaultAddr = await market.collateralVault();
    const vault = new ethers.Contract(collateralVaultAddr, abis.CollateralVault as any, admin);
    console.log(`vault deployed at ${collateralVaultAddr} (tier 2 = sUSDe)`);

    header("3. mint + enter positions");
    await send(usdt0, "mint", [aliceW.address, 10_000_000_000n]);
    await send(usdt0, "mint", [bobW.address, 10_000_000_000n]);

    const usdt0Alice = usdt0.connect(alice) as ethers.Contract;
    const usdt0Bob = usdt0.connect(bob) as ethers.Contract;
    const marketAlice = market.connect(alice) as ethers.Contract;
    const marketBob = market.connect(bob) as ethers.Contract;

    await send(usdt0Alice, "approve", [marketAddr, 500_000_000n]);
    await send(marketAlice, "enter", [0, 500_000_000n, ethers.id("allora"), ethers.id("nansen")]);
    console.log(`alice entered $500 on YES`);

    await send(usdt0Bob, "approve", [marketAddr, 500_000_000n]);
    await send(marketBob, "enter", [1, 500_000_000n, ethers.zeroPadValue("0x", 32), ethers.zeroPadValue("0x", 32)]);
    console.log(`bob entered $500 on NO`);

    const [pY, pN] = await market.currentPrice();
    console.log(`current LMSR prices: YES=${fmtWad(pY)}, NO=${fmtWad(pN)} (sum=${fmtWad(pY + pN)})`);
    console.log(`vault principal: $${fmtUsdt0(await vault.principalUsdt0())}, value: $${fmtUsdt0(await vault.vaultValue())}`);

    // On testnet, market stays open 1d so we can't fast-forward to resolution.
    // Bail out here — entries are proven, resolution is covered by forge tests + anvil smoke.
    if (!isLocal) {
        console.log(`\n✓ entries landed on Mantle Sepolia.`);
        console.log(`  market: https://sepolia.mantlescan.xyz/address/${marketAddr}`);
        console.log(`  resolution flow is covered by forge tests + the anvil smoke.`);
        return;
    }

    header("4. time-warp + accrue yield (anvil only)");
    if (RPC_URL.includes("localhost")) {
        // Jump 365 days forward so the 12% APY mock accrues fully.
        await provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await provider.send("evm_mine", []);
        const v = await vault.vaultValue();
        const yld = await vault.accruedYield();
        console.log(`after 365 days: vault value=$${fmtUsdt0(v)}, yield=$${fmtUsdt0(yld)}`);
    } else {
        console.log(`(skip — non-local RPC)`);
    }

    header("5. oracle swarm votes (3 of 3 → YES)");
    const reasoningHash = ethers.id("oracle-reasoning-blob-cid");
    // Contract: keccak256(abi.encode(market, vote, reasoningHash)).toEthSignedMessageHash()
    const digestRaw = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint8", "bytes32"],
            [marketAddr, 0, reasoningHash],
        ),
    );
    const oracles = [
        {nm: oracleA, w: oracleAW},
        {nm: oracleB, w: oracleBW},
        {nm: oracleC, w: oracleCW},
    ];
    for (const o of oracles) {
        const sig = await o.w.signMessage(ethers.getBytes(digestRaw));
        const swarmAsOracle = swarm.connect(o.w) as ethers.Contract;
        await send(swarmAsOracle, "submitVote", [marketAddr, 0, reasoningHash, sig]);
        console.log(`oracle ${o.w.address.slice(0, 8)} voted YES`);
    }

    header("6. finalize");
    await send(swarm, "finalize", [marketAddr]);
    const outcome = await market.outcome();
    console.log(`market outcome = ${outcome} (1=YES, 2=NO, 3=INVALID)`);

    header("7. alice claims");
    const aliceBalBefore: bigint = await usdt0.balanceOf(aliceW.address);
    await send(marketAlice, "claim", []);
    const aliceBalAfter: bigint = await usdt0.balanceOf(aliceW.address);
    const payout: bigint = aliceBalAfter - aliceBalBefore;
    console.log(`alice claimed: $${fmtUsdt0(payout)} (staked $500)`);
    console.log(`profit: $${fmtUsdt0(payout - 500_000_000n)}`);

    try {
        await send(marketBob, "claim", []);
        console.log("ERROR: bob's claim should have reverted");
    } catch (e: any) {
        console.log(`bob's claim correctly reverted (${(e.shortMessage ?? e.message)?.slice(0, 80)})`);
    }

    console.log("\n✓ smoke test passed");
}

main().catch((err) => {
    console.error("smoke FAILED:", err);
    process.exit(1);
});
