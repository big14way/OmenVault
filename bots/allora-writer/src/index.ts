/**
 * AlloraConsumer writer bot.
 *
 * Polls a forecast source every POLL_INTERVAL_SEC and writes P(YES) to the
 * AlloraConsumer contract via writeForecast(topicId, valueE18). The writing
 * key must hold ATTESTOR_ROLE (the deployer key in .env is granted this on
 * deploy).
 *
 * Sources:
 *   - Real Allora: set ALLORA_BASE_URL (e.g. https://api.allora.network) and
 *     optionally ALLORA_API_KEY. For each configured topic the bot calls
 *     `GET ${ALLORA_BASE_URL}/allora/${topicId}/latest` and parses an
 *     inference value into a P(YES) WAD. (ALLORA_API_BASE is honored as a
 *     legacy alias.)
 *   - Demo mode (no ALLORA_BASE_URL): derives P(YES) from CoinGecko 24h price
 *     change of the asset mapped to the topic. Clearly logged as "demo"; the
 *     contract event still emits, so the trader and UI see real activity.
 *
 * Run with: pnpm -F @omenvault/allora-writer start
 */

import {Contract, type ContractTransactionResponse} from "ethers";
import "dotenv/config";
import {provider, signer, requireEnv, optionalEnv} from "@omenvault/shared";
import {abis} from "@omenvault/shared/abis";

const POLL_INTERVAL_SEC = Number(optionalEnv("ALLORA_POLL_INTERVAL_SEC", "60"));
// Accept either name. ALLORA_BASE_URL is the canonical .env key; ALLORA_API_BASE
// is kept as a legacy alias so existing configs keep working.
const ALLORA_API_BASE = optionalEnv("ALLORA_BASE_URL") || optionalEnv("ALLORA_API_BASE");
const ALLORA_API_KEY = optionalEnv("ALLORA_API_KEY");

// Mapping: numeric Allora topic id → asset symbol the writer should fetch for
// the demo path. Aligned with apps/web/components/markets/new-market-form.tsx
// (topic 14 = ETH, 1 = BTC, 8 = SOL).
const TOPIC_TO_COINGECKO_ID: Record<string, string> = {
    "14": "ethereum",
    "1": "bitcoin",
    "8": "solana",
};

const TOPIC_TO_SYMBOL: Record<string, string> = {
    "14": "ETH",
    "1": "BTC",
    "8": "SOL",
};

// Topics to write each cycle. Override via ALLORA_TOPICS=14,1,8.
const TOPICS = optionalEnv("ALLORA_TOPICS", "14,1,8")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

function topicIdBytes32(numeric: string): `0x${string}` {
    const hex = BigInt(numeric).toString(16).padStart(64, "0");
    return `0x${hex}` as `0x${string}`;
}

const E18 = 10n ** 18n;
const HALF = 5n * 10n ** 17n;

/**
 * Maps a 24h % change into a P(YES the asset keeps trending) in WAD.
 * Logistic-ish: bigger up moves → higher P(YES). Clamped to [0.1, 0.9] so
 * traders never see a forecast that pins to a degenerate edge.
 */
function momentumToProbabilityE18(change24hPct: number): bigint {
    const x = change24hPct / 5; // scale: ±5% maps to ~±1 in tanh input
    const tanh = Math.tanh(x);
    const p = 0.5 + 0.5 * tanh;
    const clamped = Math.max(0.1, Math.min(0.9, p));
    return BigInt(Math.round(clamped * 1e18));
}

interface ForecastResult {
    topicId: string;
    valueE18: bigint;
    source: "allora" | "demo-coingecko" | "fallback";
    note: string;
}

async function fetchDemoForecast(topic: string): Promise<ForecastResult> {
    const cgId = TOPIC_TO_COINGECKO_ID[topic];
    if (!cgId) {
        return {topicId: topic, valueE18: HALF, source: "fallback", note: "unknown topic; default 0.5"};
    }
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {signal: AbortSignal.timeout(8000)});
    if (!res.ok) throw new Error(`coingecko HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, {usd: number; usd_24h_change: number}>;
    const change = data[cgId]?.usd_24h_change;
    if (typeof change !== "number") {
        return {topicId: topic, valueE18: HALF, source: "fallback", note: "no 24h change; default 0.5"};
    }
    const value = momentumToProbabilityE18(change);
    return {
        topicId: topic,
        valueE18: value,
        source: "demo-coingecko",
        note: `${TOPIC_TO_SYMBOL[topic]} 24h ${change.toFixed(2)}% → P(YES)=${(Number(value) / 1e18).toFixed(3)}`,
    };
}

async function fetchAlloraForecast(topic: string, base: string): Promise<ForecastResult> {
    const url = `${base.replace(/\/$/, "")}/allora/${topic}/latest`;
    const headers: Record<string, string> = {};
    if (ALLORA_API_KEY) headers["x-api-key"] = ALLORA_API_KEY;
    const res = await fetch(url, {headers, signal: AbortSignal.timeout(8000)});
    if (!res.ok) throw new Error(`allora HTTP ${res.status}`);
    const data = (await res.json()) as {value?: string | number};
    if (data.value == null) throw new Error(`allora: response missing 'value' for topic ${topic}`);
    // Accept either a decimal probability (0-1) or already-WAD-scaled bigint string.
    const asNumber = typeof data.value === "number" ? data.value : Number(data.value);
    if (Number.isFinite(asNumber) && asNumber > 0 && asNumber <= 1) {
        return {
            topicId: topic,
            valueE18: BigInt(Math.round(asNumber * 1e18)),
            source: "allora",
            note: `topic ${topic}: P(YES)=${asNumber.toFixed(3)}`,
        };
    }
    // Treat as already-scaled WAD string.
    return {
        topicId: topic,
        valueE18: BigInt(String(data.value)),
        source: "allora",
        note: `topic ${topic}: raw WAD value`,
    };
}

async function step(consumer: Contract) {
    for (const topic of TOPICS) {
        let result: ForecastResult;
        try {
            result = ALLORA_API_BASE
                ? await fetchAlloraForecast(topic, ALLORA_API_BASE)
                : await fetchDemoForecast(topic);
        } catch (err) {
            console.error(`[allora-writer] fetch failed for topic ${topic}:`, (err as Error).message);
            continue;
        }
        try {
            const tx: ContractTransactionResponse = await consumer.writeForecast(
                topicIdBytes32(result.topicId),
                result.valueE18,
            );
            const receipt = await tx.wait();
            console.log(
                `[allora-writer] wrote topic=${result.topicId} value=${result.valueE18} ` +
                    `source=${result.source} note="${result.note}" tx=${receipt?.hash}`,
            );
        } catch (err) {
            console.error(`[allora-writer] writeForecast failed for topic ${topic}:`, (err as Error).message);
        }
    }
}

async function main() {
    const consumerAddr = requireEnv("ALLORA_CONSUMER_ADDRESS");
    const attestor = signer(); // uses PRIVATE_KEY by default
    const consumer = new Contract(consumerAddr, abis.AlloraConsumer as any, attestor);

    console.log(
        `[allora-writer] started — topics=[${TOPICS.join(",")}] interval=${POLL_INTERVAL_SEC}s ` +
            `mode=${ALLORA_API_BASE ? "real (" + ALLORA_API_BASE + ")" : "demo-coingecko"} ` +
            `attestor=${await attestor.getAddress()}`,
    );

    // Run the first cycle immediately so the contract sees a value within seconds.
    await step(consumer);

    setInterval(() => {
        step(consumer).catch((err) => console.error("[allora-writer] cycle error:", err));
    }, POLL_INTERVAL_SEC * 1000);
}

main().catch((err) => {
    console.error("[allora-writer] fatal:", err);
    process.exit(1);
});

// Hush unused-import lints in TS strict mode.
void provider;
