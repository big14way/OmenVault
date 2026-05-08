/**
 * Natural-language question parser. Converts a Market.question string into a
 * structured threshold rule the oracle can evaluate against a price feed.
 *
 * Supports questions of the shape:
 *   "Will <SYMBOL> close above $<NUMBER>[K] on <DATE>?"
 *   "Will <SYMBOL> close below $<NUMBER>[K] on <DATE>?"
 *
 * For unrecognized formats, returns null and the oracle will vote INVALID.
 */

export interface QuestionRule {
    pair: string; // e.g. "ETH/USD"
    op: "gt" | "lt";
    threshold: number;
    raw: string;
}

const ABOVE_BELOW = /(above|below|>=|<=|>|<)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(k|K)?/;
const SYMBOL = /\b(ETH|BTC|MNT|SOL|USDC|USDT)\b/i;

export function parseQuestion(q: string): QuestionRule | null {
    const symMatch = q.match(SYMBOL);
    const opMatch = q.match(ABOVE_BELOW);
    if (!symMatch || !opMatch) return null;

    const sym = symMatch[1].toUpperCase();
    const opWord = opMatch[1].toLowerCase();
    const op: "gt" | "lt" = opWord === "above" || opWord === ">=" || opWord === ">" ? "gt" : "lt";
    let threshold = Number(opMatch[2].replace(/,/g, ""));
    if (opMatch[3]) threshold *= 1_000;

    if (!Number.isFinite(threshold) || threshold <= 0) return null;
    return {pair: `${sym}/USD`, op, threshold, raw: q};
}

export function evaluate(rule: QuestionRule, priceUsd: number): "YES" | "NO" {
    if (rule.op === "gt") return priceUsd > rule.threshold ? "YES" : "NO";
    return priceUsd < rule.threshold ? "YES" : "NO";
}
