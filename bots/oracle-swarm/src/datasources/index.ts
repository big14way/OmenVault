/**
 * Oracle data-source assignments per the build brief:
 *   Oracle A: CoinGecko + Binance
 *   Oracle B: Kraken + Coinbase
 *   Oracle C: CryptoCompare + Pyth (TODO — Pyth historical needs more glue)
 *
 * Each oracle averages its two sources for robustness. If one source fails,
 * we fall back to the other; if both fail, we return INVALID.
 */

import type {DataSource, PriceQuote} from "./types.js";
import {coingecko} from "./coingecko.js";
import {binance} from "./binance.js";
import {kraken} from "./kraken.js";
import {coinbase} from "./coinbase.js";

export type OracleId = "A" | "B" | "C";

export const SOURCES: Record<OracleId, DataSource[]> = {
    A: [coingecko, binance],
    B: [kraken, coinbase],
    C: [coingecko, kraken], // CryptoCompare/Pyth historical to be added by team
};

export interface AggregatedQuote {
    pair: string;
    priceUsd: number;
    sources: PriceQuote[];
    invalid: boolean;
}

export async function fetchAggregated(oracleId: OracleId, pair: string): Promise<AggregatedQuote> {
    const sources = SOURCES[oracleId];
    const settled = await Promise.allSettled(sources.map((s) => s(pair)));
    const ok = settled.filter((r): r is PromiseFulfilledResult<PriceQuote> => r.status === "fulfilled").map((r) => r.value);

    if (ok.length === 0) {
        return {pair, priceUsd: 0, sources: [], invalid: true};
    }

    const avg = ok.reduce((a, q) => a + q.priceUsd, 0) / ok.length;
    return {pair, priceUsd: avg, sources: ok, invalid: false};
}

export type {PriceQuote, DataSource};
