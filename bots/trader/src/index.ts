/**
 * Trader bot — the headline AI surface.
 *
 * Per market in TARGET_MARKETS (or arg[1] if invoked as a CLI), each cycle:
 *   1. Read Market.currentPrice() — current LMSR YES/NO prices.
 *   2. Read AlloraConsumer.getForecast(market.alloraTopicId, MAX_STALENESS).
 *   3. Read Nansen smart-money signal from the local watcher cache.
 *   4. Compose a structured prompt for claude-haiku-4-5 (or the heuristic fallback).
 *   5. If decision.action == ENTER: approve USDT0 and call Market.enter.
 *   6. Pin reasoning blob and emit DecisionLog.logDecision (best-effort).
 *
 * The LLM gets all three signals and produces a sized position with reasoning —
 * not a hardcoded heuristic. The reasoning trail is the demo moment.
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";
import {ethers} from "ethers";
import {abis} from "@omenvault/shared/abis";
import {decide, type Decision} from "./anthropic.js";
import {getSignal} from "./nansen.js";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

/// Lazily-read so demo.ts can override env vars before the first call without re-importing.
function cfg() {
    return {
        RPC_URL: process.env.RPC_URL ?? process.env.MANTLE_SEPOLIA_RPC_URL ?? "http://localhost:8545",
        TRADER_PK: process.env.TRADER_PRIVATE_KEY ?? process.env.PRIVATE_KEY!,
        ALLORA_CONSUMER: process.env.ALLORA_CONSUMER_ADDRESS!,
        DECISION_LOG: process.env.DECISION_LOG_ADDRESS!,
        USDT0: process.env.USDT0_ADDRESS!,
        ALLORA_STALENESS_SEC: Number(process.env.ALLORA_STALENESS_SEC ?? 86_400),
        POLL_INTERVAL_MS: Number(process.env.TRADER_POLL_MS ?? 30_000),
        /// Per-market cap. Bot will not size a single bet above this.
        MAX_BET_USDT0: BigInt(process.env.TRADER_MAX_BET_USDT0 ?? 1_500_000_000),
    };
}

export interface RunOptions {
    marketAddr: string;
    dryRun?: boolean;
}

export interface RunResult {
    market: string;
    priceYesE18: bigint;
    priceNoE18: bigint;
    alloraForecastYesE18: bigint;
    nansen: {yesCount: number; noCount: number; neutral: boolean};
    decision: Decision;
    txHash?: string;
    sharesMintedWad?: bigint;
}

function fmtWad(n: bigint): string {
    return (Number(n) / 1e18).toFixed(4);
}

function fmtUsdt0(n: bigint): string {
    return (Number(n) / 1e6).toFixed(2);
}

export async function runTraderOnce(opts: RunOptions): Promise<RunResult> {
    const C = cfg();
    const provider = new ethers.JsonRpcProvider(C.RPC_URL, undefined, {batchMaxCount: 1});
    const trader = new ethers.Wallet(C.TRADER_PK, provider);

    const market = new ethers.Contract(opts.marketAddr, abis.Market as any, trader);
    const alloraConsumer = new ethers.Contract(C.ALLORA_CONSUMER, abis.AlloraConsumer as any, provider);
    const usdt0 = new ethers.Contract(C.USDT0, abis.MockUSDT0 as any, trader);

    // 1. Price + topic.
    const [priceYesE18, priceNoE18] = await market.currentPrice();
    const question = await market.question();
    const topicId: string = await market.alloraTopicId();

    // 2. Allora forecast — read on-chain, fall back to 50% if no fresh forecast.
    let alloraForecastYesE18 = 5n * 10n ** 17n; // 0.5
    try {
        alloraForecastYesE18 = await alloraConsumer.getForecast(topicId, C.ALLORA_STALENESS_SEC);
    } catch {
        // No fresh forecast — caller can run scripts/seed-allora.ts to seed one.
    }

    // 3. Nansen smart-money flow on the market's underlying token (USDT0 as a placeholder
    // for the demo; the team should map per-market to the relevant token).
    const nansen = await getSignal(C.USDT0);

    // 4. Decision.
    const decision = await decide({
        question,
        priceYesE18,
        priceNoE18,
        alloraForecastYesE18,
        smartMoneyYes: nansen.yesCount,
        smartMoneyNo: nansen.noCount,
        maxBetUsdt0: C.MAX_BET_USDT0,
    });

    console.log(`\n--- Trader decision for ${opts.marketAddr} ---`);
    console.log(`Q: ${question}`);
    console.log(`Market: YES=${fmtWad(priceYesE18)}  NO=${fmtWad(priceNoE18)}`);
    console.log(`Allora: P(YES)=${fmtWad(alloraForecastYesE18)}`);
    console.log(`Nansen: yes=${nansen.yesCount} no=${nansen.noCount} ${nansen.neutral ? "(neutral)" : ""}`);
    console.log(`Action: ${decision.action} ${decision.side} size=$${fmtUsdt0(decision.sizeUsdt0)} confidence=${decision.confidence.toFixed(2)}`);
    console.log(`Reasoning: ${decision.reasoning}`);

    const result: RunResult = {
        market: opts.marketAddr,
        priceYesE18,
        priceNoE18,
        alloraForecastYesE18,
        nansen,
        decision,
    };

    if (decision.action !== "ENTER" || decision.sizeUsdt0 === 0n || opts.dryRun) {
        return result;
    }

    // 5. Approve + enter.
    const sideId = decision.side === "YES" ? 0 : 1;
    const alloraSnap = ethers.id(`allora:${alloraForecastYesE18.toString()}`);
    const nansenSnap = ethers.id(`nansen:${nansen.yesCount}:${nansen.noCount}`);

    // Refresh nonce each tx — same anvil race fix as smoke.ts.
    const traderAddr = await trader.getAddress();
    let nonce = await provider.getTransactionCount(traderAddr, "pending");

    const allowance: bigint = await usdt0.allowance(traderAddr, opts.marketAddr);
    if (allowance < decision.sizeUsdt0) {
        const tx = await usdt0.approve(opts.marketAddr, ethers.MaxUint256, {nonce: nonce++});
        await tx.wait();
    }

    const enterTx = await market.enter(sideId, decision.sizeUsdt0, alloraSnap, nansenSnap, {nonce: nonce++});
    const enterRcpt = await enterTx.wait();
    result.txHash = enterRcpt.hash;

    // Decode Entered event for sharesMinted.
    const enteredLog = enterRcpt.logs
        .map((l: any) => {
            try {
                return market.interface.parseLog(l);
            } catch {
                return null;
            }
        })
        .find((p: any) => p && p.name === "Entered");
    if (enteredLog) {
        result.sharesMintedWad = enteredLog.args.sharesMintedWad as bigint;
        console.log(`Entered: tx=${result.txHash} shares=${fmtWad(result.sharesMintedWad)}`);
    }

    // 6. DecisionLog (best-effort).
    if (C.DECISION_LOG) {
        try {
            const decisionLog = new ethers.Contract(C.DECISION_LOG, abis.DecisionLog as any, trader);
            const payload = JSON.stringify({
                market: opts.marketAddr,
                action: decision.action,
                side: decision.side,
                sizeUsdt0: decision.sizeUsdt0.toString(),
                confidence: decision.confidence,
                reasoning: decision.reasoning,
                inputs: {
                    priceYesE18: priceYesE18.toString(),
                    alloraForecastYesE18: alloraForecastYesE18.toString(),
                    nansen,
                },
                ts: Date.now(),
            });
            const payloadHash = ethers.id(payload);
            // Note: the trader's agent token id isn't fetched here for brevity; the on-chain
            // DecisionLog accepts uint256 agentId so callers can pass 0 for unregistered.
            const cid = "ipfs://mock"; // TODO(team): pin via @omenvault/shared/ipfs
            const tx = await decisionLog.logDecision(0, 0, payloadHash, cid, {nonce: nonce++});
            await tx.wait();
        } catch (e: any) {
            console.warn(`DecisionLog write skipped: ${e.shortMessage ?? e.message?.slice(0, 80)}`);
        }
    }

    return result;
}

async function main() {
    const argMarket = process.argv[2];
    if (!argMarket) {
        console.error("usage: trader <marketAddr> [--dry-run]");
        console.error("   or: TRADER_LOOP=1 trader <marketAddr> [<marketAddr> ...]");
        process.exit(2);
    }
    const dryRun = process.argv.includes("--dry-run");

    if (process.env.TRADER_LOOP) {
        const markets = process.argv.slice(2).filter((a) => a.startsWith("0x"));
        const pollMs = cfg().POLL_INTERVAL_MS;
        console.log(`[trader] loop mode, polling ${markets.length} market(s) every ${pollMs}ms`);
        // eslint-disable-next-line no-constant-condition
        while (true) {
            for (const m of markets) {
                try {
                    await runTraderOnce({marketAddr: m, dryRun});
                } catch (e: any) {
                    console.error(`[trader] error on ${m}:`, e.shortMessage ?? e.message);
                }
            }
            await new Promise((r) => setTimeout(r, pollMs));
        }
    } else {
        await runTraderOnce({marketAddr: argMarket, dryRun});
    }
}

if (process.argv[1] && process.argv[1].endsWith("index.ts")) {
    main().catch((err) => {
        console.error("[trader] fatal:", err);
        process.exit(1);
    });
}
