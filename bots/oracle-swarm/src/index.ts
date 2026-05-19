/**
 * Oracle swarm bot — one of three independent processes (A / B / C), selected
 * by the ORACLE env var. Each oracle:
 *
 *   1. Polls OracleSwarm for markets where resolutionAt has passed and we
 *      haven't voted yet.
 *   2. Reads the market.question, parses it into a structured rule.
 *   3. Fetches canonical price data from this oracle's two sources (different
 *      per oracle for redundancy).
 *   4. Classifies YES / NO / INVALID.
 *   5. Builds a reasoning JSON, computes its hash (would be IPFS CID in
 *      production), signs (market, vote, reasoningHash) as an Eth signed
 *      message, and submits via OracleSwarm.submitVote.
 *
 * Run a single market resolution:
 *   ORACLE=A pnpm vote <marketAddr>
 *
 * Run the loop:
 *   ORACLE=A pnpm start    # polls all known markets every POLL_INTERVAL_MS
 *
 * Required env: MANTLE_SEPOLIA_RPC_URL (or RPC_URL), ORACLE_<X>_PRIVATE_KEY,
 * ORACLE_SWARM_ADDRESS, MARKET_FACTORY_ADDRESS.
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";
import {ethers} from "ethers";
import {abis} from "@omenvault/shared/abis";
import {pinJson} from "@omenvault/shared/ipfs";
import {fetchAggregated, type OracleId} from "./datasources/index.js";
import {parseQuestion, evaluate} from "./question.js";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

function cfg() {
    const oid = (process.env.ORACLE ?? "A").toUpperCase() as OracleId;
    return {
        ORACLE_ID: oid,
        RPC_URL: process.env.RPC_URL ?? process.env.MANTLE_SEPOLIA_RPC_URL ?? "http://localhost:8545",
        ORACLE_PK:
            process.env[`ORACLE_${oid}_PRIVATE_KEY`] ??
            process.env.ORACLE_PRIVATE_KEY ??
            process.env.PRIVATE_KEY!,
        SWARM: process.env.ORACLE_SWARM_ADDRESS!,
        FACTORY: process.env.MARKET_FACTORY_ADDRESS!,
        DECISION_LOG: process.env.DECISION_LOG_ADDRESS,
        POLL_INTERVAL_MS: Number(process.env.ORACLE_POLL_MS ?? 30_000),
    };
}

export type Vote = 0 | 1 | 2; // 0=YES, 1=NO, 2=INVALID
export const VoteName: Record<Vote, string> = {0: "YES", 1: "NO", 2: "INVALID"};

export interface VoteResult {
    market: string;
    vote: Vote;
    reasoningHash: string;
    txHash?: string;
    skipped?: string;
}

export interface VoteOnce {
    marketAddr: string;
    dryRun?: boolean;
}

export async function voteOnce(opts: VoteOnce): Promise<VoteResult> {
    const C = cfg();
    const provider = new ethers.JsonRpcProvider(C.RPC_URL, undefined, {batchMaxCount: 1});
    const oracle = new ethers.Wallet(C.ORACLE_PK, provider);
    const oracleAddr = await oracle.getAddress();

    const market = new ethers.Contract(opts.marketAddr, abis.Market as any, provider);
    const swarm = new ethers.Contract(C.SWARM, abis.OracleSwarm as any, oracle);
    const registry = new ethers.Contract(
        // Read AgentRegistry indirectly through the swarm (it's stored as immutable).
        await swarm.agentRegistry(),
        abis.AgentRegistry as any,
        provider,
    );

    // Skip if this oracle already voted.
    const myAgentId: bigint = await registry.tokenIdOf(oracleAddr);
    if (myAgentId === 0n) {
        return {market: opts.marketAddr, vote: 2, reasoningHash: "", skipped: "oracle not registered as ERC-8004 agent"};
    }
    const already: boolean = await swarm.hasVoted(opts.marketAddr, myAgentId);
    if (already) {
        return {market: opts.marketAddr, vote: 2, reasoningHash: "", skipped: "already voted"};
    }

    // Skip if market hasn't reached resolutionAt yet.
    const resolutionAt: bigint = await market.resolutionAt();
    const block = await provider.getBlock("latest");
    if (block!.timestamp < Number(resolutionAt)) {
        return {market: opts.marketAddr, vote: 2, reasoningHash: "", skipped: `not yet resolvable (${Number(resolutionAt) - block!.timestamp}s remaining)`};
    }

    // Read + parse the question.
    const question: string = await market.question();
    const rule = parseQuestion(question);
    if (!rule) {
        return await submitVote(opts.marketAddr, 2, {
            error: "could not parse question",
            question,
            oracle: C.ORACLE_ID,
        });
    }

    console.log(`[oracle-${C.ORACLE_ID}] resolving ${opts.marketAddr}: "${question}"`);
    console.log(`[oracle-${C.ORACLE_ID}] rule: ${rule.pair} ${rule.op} ${rule.threshold}`);

    // Fetch quotes from this oracle's data sources.
    const quote = await fetchAggregated(C.ORACLE_ID, rule.pair);
    let voteCode: Vote;
    let outcome: string;
    if (quote.invalid) {
        voteCode = 2;
        outcome = "INVALID — all data sources failed";
    } else {
        const cls = evaluate(rule, quote.priceUsd);
        voteCode = cls === "YES" ? 0 : 1;
        outcome = `${cls} (${rule.pair}=${quote.priceUsd.toFixed(2)} ${rule.op === "gt" ? ">" : "<"} ${rule.threshold})`;
    }

    console.log(`[oracle-${C.ORACLE_ID}] vote=${VoteName[voteCode]} — ${outcome}`);

    if (opts.dryRun) {
        return {market: opts.marketAddr, vote: voteCode, reasoningHash: "", skipped: "dry run"};
    }

    return await submitVote(opts.marketAddr, voteCode, {
        oracle: C.ORACLE_ID,
        question,
        rule,
        sources: quote.sources,
        priceUsd: quote.priceUsd,
        outcome,
        ts: Date.now(),
    });

    async function submitVote(marketAddr: string, vote: Vote, reasoning: unknown): Promise<VoteResult> {
        const reasoningJson = JSON.stringify(reasoning);
        const reasoningHash = ethers.id(reasoningJson);
        // Pin the reasoning blob first so we can write the real CID on chain.
        // Falls back to a deterministic mock CID if Pinata is unset/unreachable.
        const cid = await pinJson(reasoning, `omenvault-vote-${C.ORACLE_ID}-${marketAddr}`);
        // Contract: keccak256(abi.encode(market, vote, reasoningHash)).toEthSignedMessageHash()
        const digest = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "uint8", "bytes32"],
                [marketAddr, vote, reasoningHash],
            ),
        );
        const sig = await oracle.signMessage(ethers.getBytes(digest));
        let nonce = await provider.getTransactionCount(oracleAddr, "pending");
        const tx = await swarm.submitVote(marketAddr, vote, reasoningHash, sig, {nonce: nonce++});
        const rcpt = await tx.wait();

        // Best-effort DecisionLog write so the vote shows up in /audit. Requires
        // LOGGER_ROLE on this oracle wallet; swallowed if missing/unset.
        if (C.DECISION_LOG) {
            try {
                const decisionLog = new ethers.Contract(C.DECISION_LOG, abis.DecisionLog as any, oracle);
                // DecisionLog.Kind: 0=TRADE 1=ORACLE_VOTE 2=SIGNAL 3=OTHER
                const logTx = await decisionLog.logDecision(myAgentId, 1, reasoningHash, cid, {nonce: nonce++});
                await logTx.wait();
            } catch (e: any) {
                console.warn(`[oracle-${C.ORACLE_ID}] DecisionLog write skipped: ${e.shortMessage ?? e.message?.slice(0, 80)}`);
            }
        }

        return {market: marketAddr, vote, reasoningHash, txHash: rcpt.hash};
    }
}

/// Loop mode: poll the factory for all markets, vote on any that are resolvable
/// and we haven't voted on yet.
async function loop() {
    const C = cfg();
    const provider = new ethers.JsonRpcProvider(C.RPC_URL, undefined, {batchMaxCount: 1});
    const factory = new ethers.Contract(C.FACTORY, abis.MarketFactory as any, provider);

    console.log(`[oracle-${C.ORACLE_ID}] loop mode, polling every ${C.POLL_INTERVAL_MS}ms`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const len: bigint = await factory.marketsLength();
            for (let i = 0n; i < len; i++) {
                const m: string = await factory.allMarkets(i);
                try {
                    const r = await voteOnce({marketAddr: m});
                    if (r.skipped) console.log(`[oracle-${C.ORACLE_ID}] skip ${m}: ${r.skipped}`);
                    else console.log(`[oracle-${C.ORACLE_ID}] voted ${VoteName[r.vote]} on ${m}: ${r.txHash}`);
                } catch (e: any) {
                    console.error(`[oracle-${C.ORACLE_ID}] error on ${m}:`, e.shortMessage ?? e.message);
                }
            }
        } catch (e: any) {
            console.error(`[oracle-${C.ORACLE_ID}] loop error:`, e.shortMessage ?? e.message);
        }
        await new Promise((r) => setTimeout(r, C.POLL_INTERVAL_MS));
    }
}

async function main() {
    const argMarket = process.argv[2];
    if (argMarket && argMarket.startsWith("0x")) {
        const r = await voteOnce({marketAddr: argMarket, dryRun: process.argv.includes("--dry-run")});
        if (r.skipped) console.log(`skipped: ${r.skipped}`);
        else console.log(`vote=${VoteName[r.vote]} tx=${r.txHash ?? "(dry run)"}`);
    } else {
        await loop();
    }
}

if (process.argv[1] && process.argv[1].endsWith("index.ts")) {
    main().catch((err) => {
        const oid = (process.env.ORACLE ?? "?").toUpperCase();
        console.error(`[oracle-${oid}] fatal:`, err);
        process.exit(1);
    });
}
