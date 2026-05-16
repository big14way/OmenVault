/**
 * Pyth Hermes — pull-based price reads from the public hermes.pyth.network gateway.
 * No API key needed. Each feed ID is a fixed bytes32 listed at:
 *   https://docs.pyth.network/price-feeds/price-feeds
 *
 * For the resolution-time oracle path we use latest prices; historical resolution
 * via Pyth Benchmark would replace this once we wire the trader bot's timestamped
 * lookups (Benchmark requires the publish_time of the closing candle).
 */

import type {PriceQuote} from "./types.js";

// Mainnet Pyth feed IDs (Hermes serves the same IDs across deployments).
const SYMBOL_TO_FEED_ID: Record<string, string> = {
    ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    MNT: "0x4e3037c822d852d79af3ac80e35eb420ee3b870dca49f9344a38ef4773fb0585",
};

const HERMES_BASE = process.env.PYTH_HERMES_URL ?? "https://hermes.pyth.network";

interface ParsedPriceData {
    price: string;
    expo: number;
    publish_time: number;
}

interface HermesParsed {
    id: string;
    price: ParsedPriceData;
}

export async function pyth(pair: string): Promise<PriceQuote> {
    const sym = pair.split("/")[0].toUpperCase();
    const id = SYMBOL_TO_FEED_ID[sym];
    if (!id) throw new Error(`pyth: no feed id mapped for ${sym}`);

    const url = `${HERMES_BASE}/v2/updates/price/latest?ids[]=${id}&parsed=true`;
    const res = await fetch(url, {signal: AbortSignal.timeout(8000)});
    if (!res.ok) throw new Error(`pyth: HTTP ${res.status}`);

    const data = (await res.json()) as {parsed: HermesParsed[]};
    const parsed = data.parsed?.[0]?.price;
    if (!parsed) throw new Error(`pyth: no parsed price for ${sym}`);

    // Pyth returns price as integer-string with an exponent (expo is negative for
    // assets priced in decimals): priceFloat = price * 10**expo.
    const priceUsd = Number(parsed.price) * Math.pow(10, parsed.expo);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
        throw new Error(`pyth: invalid price ${parsed.price} expo ${parsed.expo}`);
    }

    return {pair, priceUsd, source: "pyth", asOf: parsed.publish_time};
}
