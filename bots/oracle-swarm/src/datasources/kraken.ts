import type {PriceQuote} from "./types.js";

const SYMBOL_TO_KRAKEN: Record<string, string> = {
    ETH: "XETHZUSD",
    BTC: "XXBTZUSD",
};

export async function kraken(pair: string): Promise<PriceQuote> {
    const sym = pair.split("/")[0].toUpperCase();
    const kSym = SYMBOL_TO_KRAKEN[sym] ?? `${sym}USD`;
    const url = `https://api.kraken.com/0/public/Ticker?pair=${kSym}`;
    const res = await fetch(url, {signal: AbortSignal.timeout(5000)});
    if (!res.ok) throw new Error(`kraken: HTTP ${res.status}`);
    const data = (await res.json()) as {result?: Record<string, {c: [string]}>; error?: string[]};
    if (data.error?.length) throw new Error(`kraken: ${data.error.join(", ")}`);
    const result = data.result?.[kSym];
    if (!result) throw new Error(`kraken: no result for ${kSym}`);
    const priceUsd = Number(result.c[0]);
    return {pair, priceUsd, source: "kraken", asOf: Math.floor(Date.now() / 1000)};
}
