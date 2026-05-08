import type {PriceQuote} from "./types.js";

export async function binance(pair: string): Promise<PriceQuote> {
    const sym = pair.replace("/", "").toUpperCase().replace(/USD$/, "USDT");
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${sym}`;
    const res = await fetch(url, {signal: AbortSignal.timeout(5000)});
    if (!res.ok) throw new Error(`binance: HTTP ${res.status}`);
    const data = (await res.json()) as {price: string};
    const priceUsd = Number(data.price);
    if (!Number.isFinite(priceUsd)) throw new Error(`binance: bad price ${data.price}`);
    return {pair, priceUsd, source: "binance", asOf: Math.floor(Date.now() / 1000)};
}
