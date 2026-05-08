import type {PriceQuote} from "./types.js";

export async function coinbase(pair: string): Promise<PriceQuote> {
    const [base, quote] = pair.split("/");
    const url = `https://api.coinbase.com/v2/prices/${base.toUpperCase()}-${quote.toUpperCase()}/spot`;
    const res = await fetch(url, {signal: AbortSignal.timeout(5000)});
    if (!res.ok) throw new Error(`coinbase: HTTP ${res.status}`);
    const data = (await res.json()) as {data?: {amount: string}};
    const priceUsd = Number(data.data?.amount);
    if (!Number.isFinite(priceUsd)) throw new Error(`coinbase: bad price`);
    return {pair, priceUsd, source: "coinbase", asOf: Math.floor(Date.now() / 1000)};
}
