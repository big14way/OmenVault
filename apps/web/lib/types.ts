// Domain types — mirror contract structs but display-friendly.
// When wagmi reads come online, replace mock-* sources with adapters that map onto these.

export type CollateralTier = "USDT0" | "USDY" | "sUSDe";

export const TIER_APY: Record<CollateralTier, number> = {
    USDT0: 0,
    USDY: 0.05,
    sUSDe: 0.12,
};

export type MarketStatus = "active" | "resolving" | "resolved" | "disputed";

export type Outcome = "YES" | "NO" | "INVALID";

export interface Market {
    id: string;
    address: string;
    question: string;
    category: "Crypto" | "Macro" | "Election" | "Custom";
    tier: CollateralTier;
    yesPrice: number; // 0..1
    noPrice: number; // 0..1
    volumeUsdt0: number;
    positionsCount: number;
    aiTradersActive: number;
    yieldEarned: number; // 0..1, e.g. 0.0042 = 0.42%
    resolutionAt: number; // unix ms
    createdAt: number;
    status: MarketStatus;
    resolvedOutcome?: Outcome;
    alloraTopicId?: string;
    creator: string;
}

export interface Position {
    marketId: string;
    bettor: string;
    side: "YES" | "NO";
    shares: number;
    stakedUsdt0: number;
    enteredAt: number;
    enteredPrice: number;
}

export type AgentType = "Bettor" | "Trader" | "OracleNode";

export interface Agent {
    id: number;
    type: AgentType;
    owner: string;
    reputation: number;
    winRate?: number;
    capitalDeployed?: number;
    majorityAlignment?: number;
    lastActionAt: number;
    createdAt: number;
}

export type DecisionKind =
    | "ENTER"
    | "EXIT"
    | "VOTE"
    | "FINALIZE"
    | "CLAIM"
    | "CREATE_MARKET"
    | "REASONING";

export interface Decision {
    id: string;
    timestamp: number;
    agentId: number;
    agentType: AgentType | "System";
    kind: DecisionKind;
    marketId?: string;
    payload: {
        side?: "YES" | "NO";
        outcome?: Outcome;
        amount?: number;
        price?: number;
        ipfsHash?: string;
        reasoning?: string;
        alloraForecast?: number;
        nansenWallets?: number;
        confidence?: number;
        sources?: string[];
    };
    txHash: string;
}

export interface OracleVote {
    oracleAgentId: number;
    marketId: string;
    vote: Outcome;
    sources: string[];
    reasoning: string;
    ipfsHash: string;
    submittedAt: number;
}
