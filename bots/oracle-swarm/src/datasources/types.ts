/**
 * Common shape every oracle data source returns. The oracle binary then maps
 * the source's answer to a Vote (YES / NO / INVALID).
 */

export interface PriceQuote {
    /// e.g. "ETH/USD", "BTC/USD"
    pair: string;
    /// Price in USD as a plain number.
    priceUsd: number;
    /// Source identifier ("coingecko", "binance", etc).
    source: string;
    /// Unix seconds.
    asOf: number;
}

export type DataSource = (pair: string) => Promise<PriceQuote>;
