import type {PriceQuote} from "./types.js";

const SYMBOL_TO_ID: Record<string, string> = {
    ETH: "ethereum",
    BTC: "bitcoin",
    MNT: "mantle",
};

export async function coingecko(pair: string): Promise<PriceQuote> {
    const sym = pair.split("/")[0].toUpperCase();
    const id = SYMBOL_TO_ID[sym];
    if (!id) throw new Error(`coingecko: unknown symbol ${sym}`);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
    const res = await fetch(url, {signal: AbortSignal.timeout(5000)});
    if (!res.ok) throw new Error(`coingecko: HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, {usd: number}>;
    const priceUsd = data[id]?.usd;
    if (typeof priceUsd !== "number") throw new Error(`coingecko: no price for ${id}`);
    return {pair, priceUsd, source: "coingecko", asOf: Math.floor(Date.now() / 1000)};
}
