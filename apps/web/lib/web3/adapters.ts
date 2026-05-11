/**
 * Adapters mapping raw on-chain shapes (bigints, packed structs) onto the display
 * types the existing frontend components already consume. Keeps wagmi types
 * confined to the hooks layer.
 */

import type {Address} from "viem";
import type {Market, CollateralTier, MarketStatus, Outcome} from "@/lib/types";

const TIERS: CollateralTier[] = ["USDT0", "USDY", "sUSDe"];
const OUTCOMES: (Outcome | undefined)[] = [undefined, "YES", "NO", "INVALID"];

export interface OnChainMarket {
    address: Address;
    question: string;
    resolutionAt: bigint;
    alloraTopicId: `0x${string}`;
    collateralTier: number;
    yesSharesWad: bigint;
    noSharesWad: bigint;
    yesPriceE18: bigint;
    noPriceE18: bigint;
    totalStakedUsdt0: bigint;
    outcome: number;
    /// USDT0-equivalent value of the vault (principal + accrued yield).
    vaultValueUsdt0: bigint;
    /// USDT0-denominated principal currently in the vault.
    principalUsdt0: bigint;
    /// Number of distinct bettors that have entered. Optional — falls back to 0.
    positionsCount?: number;
    aiTradersActive?: number;
}

export function toMarket(oc: OnChainMarket, createdAt = 0): Market {
    const tier = TIERS[oc.collateralTier] ?? "USDT0";
    const status: MarketStatus = statusFromOutcome(oc.outcome, Number(oc.resolutionAt));
    const yesPrice = wadToFloat(oc.yesPriceE18);
    const noPrice = wadToFloat(oc.noPriceE18);
    const vault = Number(oc.vaultValueUsdt0);
    const principal = Number(oc.principalUsdt0);
    const yieldEarned = principal > 0 ? (vault - principal) / principal : 0;

    return {
        id: oc.address,
        address: oc.address,
        question: oc.question,
        category: categoryFromQuestion(oc.question),
        tier,
        yesPrice,
        noPrice,
        volumeUsdt0: Number(oc.totalStakedUsdt0) / 1e6,
        positionsCount: oc.positionsCount ?? 0,
        aiTradersActive: oc.aiTradersActive ?? 0,
        yieldEarned,
        resolutionAt: Number(oc.resolutionAt) * 1000,
        createdAt: createdAt * 1000,
        status,
        resolvedOutcome: OUTCOMES[oc.outcome],
        alloraTopicId: oc.alloraTopicId,
        creator: oc.address, // factory deploys it; creator identity isn't tracked on-chain yet
    };
}

function statusFromOutcome(outcome: number, resolutionAtSec: number): MarketStatus {
    if (outcome === 1 || outcome === 2) return "resolved";
    if (outcome === 3) return "disputed";
    if (Date.now() / 1000 >= resolutionAtSec) return "resolving";
    return "active";
}

function categoryFromQuestion(q: string): Market["category"] {
    const lower = q.toLowerCase();
    if (/(eth|btc|sol|mnt|usdc|usdt|crypto)/.test(lower)) return "Crypto";
    if (/(cpi|fed|rate|inflation|gdp|macro)/.test(lower)) return "Macro";
    if (/(election|president|vote|congress|prime minister)/.test(lower)) return "Election";
    return "Custom";
}

function wadToFloat(x: bigint): number {
    return Number(x) / 1e18;
}
