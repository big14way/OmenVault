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
import {pinJson} from "@omenvault/shared/ipfs";
import {provider as resilientProvider} from "@omenvault/shared/rpc";
import {decide, type Decision} from "./anthropic.js";
import {getSignal} from "./nansen.js";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

// Cached ERC-8004 agent token id for the trader wallet. Looked up once on the
// first DecisionLog write — passing the real id (not 0) is what ties on-chain
// decisions back to this agent's dossier in the UI.
let cachedAgentId: bigint | null = null;

/// Lazily-read so demo.ts can override env vars before the first call without re-importing.
function cfg() {
    return {
        RPC_URL: process.env.RPC_URL ?? process.env.MANTLE_SEPOLIA_RPC_URL ?? "http://localhost:8545",
        TRADER_PK: process.env.TRADER_PRIVATE_KEY ?? process.env.PRIVATE_KEY!,
        ALLORA_CONSUMER: process.env.ALLORA_CONSUMER_ADDRESS!,
        DECISION_LOG: process.env.DECISION_LOG_ADDRESS!,
        AGENT_REGISTRY: process.env.AGENT_REGISTRY_ADDRESS!,
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
    const provider = resilientProvider();
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

    // Refresh nonce each tx — same anvil race fix as smoke.ts.
    const traderAddr = await trader.getAddress();
    let nonce = await provider.getTransactionCount(traderAddr, "pending");

    // Log every decision (PASS included) so the UI's reasoning trail is live
    // even when the trader chooses not to enter. Best-effort: a log-write
    // failure must not prevent the enter flow.
    async function resolveAgentId(): Promise<bigint> {
        if (cachedAgentId !== null) return cachedAgentId;
        if (!C.AGENT_REGISTRY) return 0n;
        try {
            const registry = new ethers.Contract(C.AGENT_REGISTRY, abis.AgentRegistry as any, provider);
            const id: bigint = await registry.tokenIdOf(traderAddr);
            cachedAgentId = id;
            return id;
        } catch {
            cachedAgentId = 0n;
            return 0n;
        }
    }

    async function logToDecisionLog(): Promise<void> {
        if (!C.DECISION_LOG) return;
        try {
            const agentId = await resolveAgentId();
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
            const cid = await pinJson(JSON.parse(payload), `omenvault-trade-${opts.marketAddr}`);
            // kind=0 → TRADE (UI shows as ENTER under the trader dossier).
            const tx = await decisionLog.logDecision(agentId, 0, payloadHash, cid, {nonce: nonce++});
            await tx.wait();
        } catch (e: any) {
            console.warn(`DecisionLog write skipped: ${e.shortMessage ?? e.message?.slice(0, 80)}`);
        }
    }

    // Log the decision (intent) unconditionally — before any on-chain action —
    // so a revert on enter() still leaves a reasoning trail visible in the UI.
    await logToDecisionLog();

    if (decision.action !== "ENTER" || decision.sizeUsdt0 === 0n || opts.dryRun) {
        return result;
    }

    // 5. Approve + enter.
    const sideId = decision.side === "YES" ? 0 : 1;
    const alloraSnap = ethers.id(`allora:${alloraForecastYesE18.toString()}`);
    const nansenSnap = ethers.id(`nansen:${nansen.yesCount}:${nansen.noCount}`);

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

    return result;
}

async function main() {
    const dryRun = process.argv.includes("--dry-run");
    const cliMarkets = process.argv.slice(2).filter((a) => a.startsWith("0x"));
    const argMarket = cliMarkets[0];

    // Loop mode: explicit (TRADER_LOOP=1), or implicit when no market is passed
    // on the CLI. Auto-discovers open markets via MarketFactory.allMarkets() so
    // `pnpm demo` can boot the trader without first capturing the seed output.
    const loopMode = process.env.TRADER_LOOP || cliMarkets.length === 0;

    if (loopMode) {
        const C = cfg();
        const provider = resilientProvider();
        const factoryAddr = process.env.MARKET_FACTORY_ADDRESS;
        if (cliMarkets.length === 0 && !factoryAddr) {
            console.error("trader: no markets passed and MARKET_FACTORY_ADDRESS unset");
            process.exit(2);
        }
        const factory = factoryAddr
            ? new ethers.Contract(factoryAddr, abis.MarketFactory as any, provider)
            : null;
        const pollMs = C.POLL_INTERVAL_MS;
        console.log(
            `[trader] loop mode, polling every ${pollMs}ms ` +
                (cliMarkets.length ? `(${cliMarkets.length} pinned market(s))` : "(auto-discover from factory)"),
        );
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let markets = cliMarkets;
            if (factory && markets.length === 0) {
                try {
                    const len: bigint = await factory.marketsLength();
                    const discovered: string[] = [];
                    for (let i = 0n; i < len; i++) discovered.push(await factory.allMarkets(i));
                    markets = discovered;
                } catch (e: any) {
                    console.error("[trader] factory enumerate error:", e.shortMessage ?? e.message);
                }
            }
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
