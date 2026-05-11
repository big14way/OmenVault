// Mock data for Day 1-3 development. Swap to wagmi reads once contracts are deployed (Day 4+).
// Keep this file the only mock source — pages should import from here, not inline mocks.

import type {Agent, Decision, Market, OracleVote, Position} from "./types";

const now = Date.now();
const day = 86_400_000;

export const MOCK_MARKETS: Market[] = [
    {
        id: "7",
        address: "0x7a4f1b9e0c8d3e5f2a1b6c8d9e0f1a2b3c4d5e6f",
        question: "Will ETH close above $4,500 on 2026-07-15?",
        category: "Crypto",
        tier: "sUSDe",
        yesPrice: 0.62,
        noPrice: 0.38,
        volumeUsdt0: 12_400,
        positionsCount: 18,
        aiTradersActive: 3,
        yieldEarned: 0.0042,
        resolutionAt: now + 14 * day,
        createdAt: now - 6 * day,
        status: "active",
        alloraTopicId: "14",
        creator: "0x1ab2c3d4e5f60718293a4b5c6d7e8f9012345678",
    },
    {
        id: "5",
        address: "0x5c2a8d1e3f4b9c0d8e7f6a5b4c3d2e1f0a9b8c7d",
        question: "Will the Fed cut rates by 25bps at the July 2026 FOMC?",
        category: "Macro",
        tier: "USDY",
        yesPrice: 0.71,
        noPrice: 0.29,
        volumeUsdt0: 48_900,
        positionsCount: 41,
        aiTradersActive: 2,
        yieldEarned: 0.0018,
        resolutionAt: now + 9 * day,
        createdAt: now - 12 * day,
        status: "active",
        creator: "0x9c8b7a6d5e4f3c2b1a09876543210fedcba98765",
    },
    {
        id: "4",
        address: "0x4f3e2d1c0b9a8d7c6e5f4a3b2c1d0e9f8a7b6c5d",
        question: "Will BTC dominance exceed 60% by 2026-08-01?",
        category: "Crypto",
        tier: "sUSDe",
        yesPrice: 0.34,
        noPrice: 0.66,
        volumeUsdt0: 22_750,
        positionsCount: 27,
        aiTradersActive: 4,
        yieldEarned: 0.0091,
        resolutionAt: now + 21 * day,
        createdAt: now - 28 * day,
        status: "active",
        alloraTopicId: "8",
        creator: "0xabcdef0123456789abcdef0123456789abcdef01",
    },
    {
        id: "3",
        address: "0x3e2d1c0b9a8f7e6d5c4b3a2e1d0c9b8a7f6e5d4c",
        question: "Will Solana TVL surpass Ethereum L2s combined by Q3 2026?",
        category: "Crypto",
        tier: "USDY",
        yesPrice: 0.18,
        noPrice: 0.82,
        volumeUsdt0: 8_200,
        positionsCount: 14,
        aiTradersActive: 1,
        yieldEarned: 0.0067,
        resolutionAt: now + 47 * day,
        createdAt: now - 18 * day,
        status: "active",
        creator: "0x7654321089abcdef7654321089abcdef76543210",
    },
    {
        id: "6",
        address: "0x6d5c4b3a2e1f0d9c8b7a6e5d4c3b2a1e0d9c8b7a",
        question: "Will NVIDIA revenue beat Q2 2026 consensus by >5%?",
        category: "Macro",
        tier: "USDT0",
        yesPrice: 0.55,
        noPrice: 0.45,
        volumeUsdt0: 3_400,
        positionsCount: 9,
        aiTradersActive: 0,
        yieldEarned: 0,
        resolutionAt: now + 5 * day,
        createdAt: now - 4 * day,
        status: "active",
        creator: "0x0fedcba9876543210fedcba9876543210fedcba9",
    },
    {
        id: "2",
        address: "0x2c1b0a9f8e7d6c5b4a392817060f5e4d3c2b1a09",
        question: "Will BTC close above $150,000 on 2026-06-30?",
        category: "Crypto",
        tier: "sUSDe",
        yesPrice: 0.48,
        noPrice: 0.52,
        volumeUsdt0: 87_600,
        positionsCount: 64,
        aiTradersActive: 5,
        yieldEarned: 0.0124,
        resolutionAt: now - 1 * day, // resolving
        createdAt: now - 30 * day,
        status: "resolving",
        alloraTopicId: "1",
        creator: "0x1234567890abcdef1234567890abcdef12345678",
    },
    {
        id: "8",
        address: "0x8e7d6c5b4a392817060f5e4d3c2b1a09b8c7d6e5",
        question: "Will SOL close above $200 on 2026-05-09 23:59 UTC?",
        category: "Crypto",
        tier: "sUSDe",
        yesPrice: 0.61,
        noPrice: 0.39,
        volumeUsdt0: 14_300,
        positionsCount: 21,
        aiTradersActive: 2,
        yieldEarned: 0.0021,
        resolutionAt: now - 2 * 3_600_000, // resolved 2h ago, awaiting verdicts
        createdAt: now - 7 * day,
        status: "resolving",
        alloraTopicId: "8",
        creator: "0x5544332211aabbccdd5544332211aabbccdd5544",
    },
    {
        id: "9",
        address: "0x9c8b7a6e5d4c3b2a1e0d9c8b7a6e5d4c3b2a1e0d",
        question: "Did the FOMC announce any rate cut at the April 2026 meeting?",
        category: "Macro",
        tier: "USDY",
        yesPrice: 0.34,
        noPrice: 0.66,
        volumeUsdt0: 9_800,
        positionsCount: 17,
        aiTradersActive: 1,
        yieldEarned: 0.0009,
        resolutionAt: now - 38 * 60_000, // 38 min ago
        createdAt: now - 5 * day,
        status: "resolving",
        creator: "0x77665544332211aabbcc77665544332211aabbcc",
    },
    {
        id: "1",
        address: "0x1a09b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1",
        question: "Did US CPI print below 2.5% YoY in June 2026?",
        category: "Macro",
        tier: "USDY",
        yesPrice: 1.0,
        noPrice: 0.0,
        volumeUsdt0: 31_200,
        positionsCount: 33,
        aiTradersActive: 0,
        yieldEarned: 0.0042,
        resolutionAt: now - 8 * day,
        createdAt: now - 60 * day,
        status: "resolved",
        resolvedOutcome: "YES",
        creator: "0xfedcba9876543210fedcba9876543210fedcba98",
    },
];

export const MOCK_AGENTS: Agent[] = [
    {
        id: 42,
        type: "Trader",
        owner: "0x1ab2c3d4e5f60718293a4b5c6d7e8f9012345678",
        reputation: 720,
        winRate: 0.71,
        capitalDeployed: 4_300,
        lastActionAt: now - 12_000,
        createdAt: now - 45 * day,
    },
    {
        id: 17,
        type: "Trader",
        owner: "0x9c8b7a6d5e4f3c2b1a09876543210fedcba98765",
        reputation: 540,
        winRate: 0.58,
        capitalDeployed: 1_900,
        lastActionAt: now - 4 * 60_000,
        createdAt: now - 30 * day,
    },
    {
        id: 7,
        type: "OracleNode",
        owner: "0xaa110011aa110011aa110011aa110011aa110011",
        reputation: 880,
        majorityAlignment: 0.92,
        lastActionAt: now - 4 * 3_600_000,
        createdAt: now - 75 * day,
    },
    {
        id: 8,
        type: "OracleNode",
        owner: "0xbb220022bb220022bb220022bb220022bb220022",
        reputation: 870,
        majorityAlignment: 0.91,
        lastActionAt: now - 4 * 3_600_000,
        createdAt: now - 75 * day,
    },
    {
        id: 9,
        type: "OracleNode",
        owner: "0xcc330033cc330033cc330033cc330033cc330033",
        reputation: 760,
        majorityAlignment: 0.83,
        lastActionAt: now - 5 * 3_600_000,
        createdAt: now - 75 * day,
    },
    {
        id: 103,
        type: "Bettor",
        owner: "0x7654321089abcdef7654321089abcdef76543210",
        reputation: 0,
        capitalDeployed: 850,
        lastActionAt: now - 2 * 3_600_000,
        createdAt: now - 14 * day,
    },
    {
        id: 88,
        type: "Trader",
        owner: "0xfedcba9876543210fedcba9876543210fedcba98",
        reputation: 410,
        winRate: 0.52,
        capitalDeployed: 2_100,
        lastActionAt: now - 36 * 60_000,
        createdAt: now - 22 * day,
    },
    ...generateAgentRoster(),
];

// Procedural roster fill. Hand-curated agents above are the ones referenced
// in MOCK_DECISIONS and the demo flow. These extras give /agents/registry
// a populated feel without needing to wire each into the activity stream.
function generateAgentRoster(): Agent[] {
    const traderSeeds: {id: number; rep: number; wr: number; cap: number; daysAgo: number; lastMin: number}[] = [
        {id: 12, rep: 640, wr: 0.66, cap: 3_200, daysAgo: 38, lastMin: 8},
        {id: 19, rep: 590, wr: 0.61, cap: 2_700, daysAgo: 31, lastMin: 23},
        {id: 23, rep: 480, wr: 0.55, cap: 1_400, daysAgo: 26, lastMin: 110},
        {id: 26, rep: 690, wr: 0.69, cap: 2_900, daysAgo: 41, lastMin: 4},
        {id: 31, rep: 350, wr: 0.49, cap: 980, daysAgo: 18, lastMin: 220},
        {id: 38, rep: 560, wr: 0.58, cap: 1_800, daysAgo: 29, lastMin: 60},
        {id: 51, rep: 290, wr: 0.46, cap: 720, daysAgo: 15, lastMin: 340},
        {id: 64, rep: 470, wr: 0.54, cap: 1_650, daysAgo: 24, lastMin: 180},
        {id: 71, rep: 620, wr: 0.63, cap: 2_400, daysAgo: 33, lastMin: 47},
        {id: 79, rep: 380, wr: 0.50, cap: 1_100, daysAgo: 20, lastMin: 95},
    ];

    const oracleSeeds: {id: number; rep: number; maj: number; daysAgo: number; lastHours: number}[] = [
        {id: 11, rep: 810, maj: 0.88, daysAgo: 75, lastHours: 4},
        {id: 13, rep: 720, maj: 0.81, daysAgo: 60, lastHours: 9},
        {id: 14, rep: 690, maj: 0.79, daysAgo: 60, lastHours: 9},
        {id: 21, rep: 540, maj: 0.71, daysAgo: 42, lastHours: 18},
        {id: 22, rep: 480, maj: 0.68, daysAgo: 42, lastHours: 21},
    ];

    const bettorSeeds: {id: number; cap: number; daysAgo: number; lastHours: number}[] = [
        {id: 104, cap: 420, daysAgo: 12, lastHours: 3},
        {id: 109, cap: 1_120, daysAgo: 19, lastHours: 7},
        {id: 116, cap: 280, daysAgo: 8, lastHours: 12},
        {id: 124, cap: 1_640, daysAgo: 26, lastHours: 2},
        {id: 138, cap: 540, daysAgo: 11, lastHours: 5},
        {id: 152, cap: 90, daysAgo: 5, lastHours: 22},
        {id: 167, cap: 2_240, daysAgo: 30, lastHours: 1},
        {id: 181, cap: 730, daysAgo: 17, lastHours: 14},
    ];

    const owner = (seed: number) =>
        "0x" + (seed * 0x9e3779b1).toString(16).padStart(8, "0").repeat(5).slice(0, 40);

    const xs: Agent[] = [];
    traderSeeds.forEach((s) => {
        xs.push({
            id: s.id,
            type: "Trader",
            owner: owner(s.id * 7),
            reputation: s.rep,
            winRate: s.wr,
            capitalDeployed: s.cap,
            lastActionAt: now - s.lastMin * 60_000,
            createdAt: now - s.daysAgo * day,
        });
    });
    oracleSeeds.forEach((s) => {
        xs.push({
            id: s.id,
            type: "OracleNode",
            owner: owner(s.id * 11),
            reputation: s.rep,
            majorityAlignment: s.maj,
            lastActionAt: now - s.lastHours * 3_600_000,
            createdAt: now - s.daysAgo * day,
        });
    });
    bettorSeeds.forEach((s) => {
        xs.push({
            id: s.id,
            type: "Bettor",
            owner: owner(s.id * 13),
            reputation: 0,
            capitalDeployed: s.cap,
            lastActionAt: now - s.lastHours * 3_600_000,
            createdAt: now - s.daysAgo * day,
        });
    });
    return xs;
}

// Deterministic reputation history for sparklines. Seeded by agent id so
// the chart is stable across renders and the same agent always shows the
// same trajectory.
export function reputationHistoryFor(agent: Agent, points = 24): number[] {
    let s = (agent.id * 0x9e3779b1 + 0x12345) >>> 0;
    const rand = () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Random walk from a low starting reputation to the current one, with
    // some variance to keep it from looking linear.
    const start = Math.max(50, Math.round(agent.reputation * 0.45));
    const out: number[] = [start];
    for (let i = 1; i < points - 1; i++) {
        const progress = i / (points - 1);
        const target = start + (agent.reputation - start) * progress;
        const jitter = (rand() - 0.45) * 80;
        out.push(Math.max(0, Math.round(target + jitter)));
    }
    out.push(agent.reputation);
    return out;
}

export const MOCK_DECISIONS: Decision[] = [
    {
        id: "d-001",
        timestamp: now - 12_000,
        agentId: 42,
        agentType: "Trader",
        kind: "ENTER",
        marketId: "7",
        payload: {
            side: "YES",
            amount: 1500,
            price: 0.55,
            ipfsHash: "QmTraderReason42",
            reasoning:
                "Allora forecast at 62% YES with high confidence — current LMSR at 0.55 implies 7% edge. Three Nansen-flagged smart-money wallets accumulated ETH this week. Sizing 1,500 USDT0, capped at 15% of vault to limit single-market drawdown. Risk-adjusted Kelly at 18% but discounted for forecast freshness.",
            alloraForecast: 0.62,
            nansenWallets: 3,
            confidence: 0.78,
        },
        txHash: "0xa1b2c3d4e5f60718293a4b5c6d7e8f9012345678abcdef1234567890abcdef12",
    },
    {
        id: "d-002",
        timestamp: now - 4 * 60_000,
        agentId: 103,
        agentType: "Bettor",
        kind: "ENTER",
        marketId: "7",
        payload: {side: "NO", amount: 250, price: 0.45},
        txHash: "0xb2c3d4e5f60718293a4b5c6d7e8f9012345678abcdef1234567890abcdef1234",
    },
    {
        id: "d-003",
        timestamp: now - 18 * 60_000,
        agentId: 17,
        agentType: "Trader",
        kind: "ENTER",
        marketId: "5",
        payload: {
            side: "YES",
            amount: 800,
            price: 0.68,
            ipfsHash: "QmTraderReason17",
            reasoning:
                "Macro forecast leans hawkish but term-structure signals 25bps cut. Smart-money flow inconclusive — sizing modestly at 800 USDT0.",
            alloraForecast: 0.69,
            nansenWallets: 0,
            confidence: 0.62,
        },
        txHash: "0xc3d4e5f60718293a4b5c6d7e8f9012345678abcdef1234567890abcdef123456",
    },
    {
        id: "d-004",
        timestamp: now - 2 * 3_600_000,
        agentId: 7,
        agentType: "OracleNode",
        kind: "VOTE",
        marketId: "2",
        payload: {
            outcome: "YES",
            ipfsHash: "QmOracle7Vote",
            reasoning: "BTC closed at $151,240 per CoinGecko + Binance spot, both within 0.4% of each other.",
            sources: ["CoinGecko", "Binance"],
        },
        txHash: "0xd4e5f60718293a4b5c6d7e8f9012345678abcdef1234567890abcdef12345678",
    },
    {
        id: "d-005",
        timestamp: now - 2 * 3_600_000 + 30_000,
        agentId: 8,
        agentType: "OracleNode",
        kind: "VOTE",
        marketId: "2",
        payload: {
            outcome: "YES",
            ipfsHash: "QmOracle8Vote",
            reasoning: "Kraken: $151,180. Coinbase: $151,310. Resolution clearly YES.",
            sources: ["Kraken", "Coinbase"],
        },
        txHash: "0xe5f60718293a4b5c6d7e8f9012345678abcdef1234567890abcdef1234567890",
    },
    {
        id: "d-006",
        timestamp: now - 2 * 3_600_000 + 90_000,
        agentId: 9,
        agentType: "OracleNode",
        kind: "VOTE",
        marketId: "2",
        payload: {
            outcome: "INVALID",
            ipfsHash: "QmOracle9Vote",
            reasoning: "Cryptocompare timed out; Pyth historical incomplete. Cannot reach quorum on canonical close — reporting INVALID rather than guess.",
            sources: ["Cryptocompare", "Pyth"],
        },
        txHash: "0xf60718293a4b5c6d7e8f9012345678abcdef1234567890abcdef123456789012",
    },
    {
        id: "d-007",
        timestamp: now - 2 * 3_600_000 + 120_000,
        agentId: 0,
        agentType: "System",
        kind: "FINALIZE",
        marketId: "2",
        payload: {outcome: "YES"},
        txHash: "0x07182093a4b5c6d7e8f9012345678abcdef1234567890abcdef12345678901234",
    },
    {
        id: "d-008",
        timestamp: now - 36 * 60_000,
        agentId: 88,
        agentType: "Trader",
        kind: "ENTER",
        marketId: "4",
        payload: {
            side: "NO",
            amount: 600,
            price: 0.66,
            ipfsHash: "QmTraderReason88",
            reasoning:
                "Allora signal weak; entering small on the consensus side. Yield-tier sUSDe means risk-adjusted EV is positive even on a flat outcome.",
            alloraForecast: 0.31,
            nansenWallets: 1,
            confidence: 0.51,
        },
        txHash: "0x18293a4b5c6d7e8f9012345678abcdef1234567890abcdef1234567890123456",
    },
    {
        id: "d-009",
        timestamp: now - 8 * day,
        agentId: 0,
        agentType: "System",
        kind: "CREATE_MARKET",
        marketId: "7",
        payload: {},
        txHash: "0x293a4b5c6d7e8f9012345678abcdef1234567890abcdef123456789012345678",
    },
    ...generateLedgerHistory(),
];

// Procedural ledger fill for /audit density. Hand-curated entries above carry
// the demo-critical reasoning blobs; these are background activity that makes
// the ledger feel like a real running protocol rather than a 9-row toy.
function generateLedgerHistory(): Decision[] {
    const minute = 60_000;
    const hour = 60 * minute;

    const traderShort = [
        "Allora at 58%, market at 0.52. Modest edge, sizing small.",
        "Allora 71% YES, three smart-money wallets long. Comfortable entry.",
        "Forecast and price drifted within 1%. Passing this cycle.",
        "Tail-risk; sizing 5% of vault on the contrarian.",
        "Smart-money flipped sides overnight. Closing the position next cycle.",
        "Edge expanded after the latest Allora poll. Adding to position.",
        "Vault cap reached on YES. Holding.",
    ];

    const oracleSources: [string, string][] = [
        ["CoinGecko", "Binance"],
        ["Kraken", "Coinbase"],
        ["Cryptocompare", "Pyth"],
        ["Bitstamp", "Binance"],
        ["Gemini", "Coinbase"],
    ];

    const txFor = (seed: number) => {
        const hex = (seed * 0x9e3779b1).toString(16).padStart(8, "0");
        const blocks = [hex, hex.split("").reverse().join(""), hex, hex.split("").reverse().join("")];
        return "0x" + blocks.join("").slice(0, 64);
    };

    const items: Decision[] = [];
    let id = 10;
    const traders = [42, 17, 88, 26, 31, 64];
    const oracles = [7, 8, 9];
    const bettors = [103, 211, 318, 442, 519];
    const markets = ["7", "5", "4", "3", "6"];

    // Spread across last 72 hours with a slight bias toward recent
    const ts = (h: number, m = 0) => now - h * hour - m * minute;

    // Recent traders
    const traderTrace: {h: number; m: number; t: number; market: string; side: "YES" | "NO"; price: number; amt: number; reason: string; allora: number; nansen: number; conf: number}[] = [
        {h: 0, m: 7, t: 42, market: "7", side: "YES", price: 0.62, amt: 800, reason: traderShort[5], allora: 0.65, nansen: 3, conf: 0.74},
        {h: 0, m: 21, t: 26, market: "5", side: "YES", price: 0.7, amt: 350, reason: traderShort[1], allora: 0.71, nansen: 2, conf: 0.68},
        {h: 0, m: 41, t: 88, market: "3", side: "NO", price: 0.82, amt: 250, reason: traderShort[3], allora: 0.22, nansen: 0, conf: 0.49},
        {h: 1, m: 8, t: 17, market: "4", side: "YES", price: 0.34, amt: 420, reason: traderShort[0], allora: 0.38, nansen: 1, conf: 0.55},
        {h: 1, m: 32, t: 31, market: "6", side: "YES", price: 0.54, amt: 180, reason: traderShort[0], allora: 0.57, nansen: 0, conf: 0.5},
        {h: 2, m: 18, t: 42, market: "7", side: "YES", price: 0.6, amt: 1200, reason: traderShort[5], allora: 0.63, nansen: 3, conf: 0.71},
        {h: 3, m: 4, t: 64, market: "4", side: "NO", price: 0.67, amt: 700, reason: traderShort[3], allora: 0.29, nansen: 1, conf: 0.58},
        {h: 4, m: 22, t: 26, market: "5", side: "YES", price: 0.69, amt: 500, reason: traderShort[1], allora: 0.7, nansen: 2, conf: 0.66},
        {h: 6, m: 47, t: 17, market: "7", side: "YES", price: 0.58, amt: 220, reason: traderShort[0], allora: 0.6, nansen: 2, conf: 0.54},
        {h: 9, m: 12, t: 31, market: "6", side: "NO", price: 0.46, amt: 95, reason: traderShort[2], allora: 0.5, nansen: 0, conf: 0.48},
        {h: 12, m: 33, t: 42, market: "7", side: "YES", price: 0.55, amt: 1500, reason: traderShort[1], allora: 0.62, nansen: 3, conf: 0.78},
        {h: 18, m: 4, t: 88, market: "5", side: "NO", price: 0.32, amt: 600, reason: traderShort[3], allora: 0.28, nansen: 0, conf: 0.52},
        {h: 24, m: 19, t: 26, market: "4", side: "YES", price: 0.36, amt: 340, reason: traderShort[0], allora: 0.4, nansen: 1, conf: 0.56},
        {h: 36, m: 8, t: 17, market: "7", side: "YES", price: 0.51, amt: 280, reason: traderShort[0], allora: 0.55, nansen: 1, conf: 0.52},
        {h: 48, m: 41, t: 42, market: "5", side: "YES", price: 0.68, amt: 950, reason: traderShort[1], allora: 0.7, nansen: 2, conf: 0.68},
    ];
    traderTrace.forEach((d, i) => {
        items.push({
            id: `d-${(id++).toString().padStart(3, "0")}`,
            timestamp: ts(d.h, d.m),
            agentId: d.t,
            agentType: "Trader",
            kind: "ENTER",
            marketId: d.market,
            payload: {
                side: d.side,
                amount: d.amt,
                price: d.price,
                ipfsHash: `QmTrader${d.t}-${i}`,
                reasoning: d.reason,
                alloraForecast: d.allora,
                nansenWallets: d.nansen,
                confidence: d.conf,
            },
            txHash: txFor(id),
        });
    });

    // Bettor entries
    const bettorTrace: {h: number; m: number; b: number; market: string; side: "YES" | "NO"; price: number; amt: number}[] = [
        {h: 0, m: 3, b: 103, market: "7", side: "NO", price: 0.45, amt: 50},
        {h: 0, m: 33, b: 211, market: "5", side: "YES", price: 0.7, amt: 120},
        {h: 1, m: 18, b: 318, market: "7", side: "YES", price: 0.6, amt: 220},
        {h: 2, m: 50, b: 442, market: "4", side: "NO", price: 0.66, amt: 90},
        {h: 5, m: 22, b: 519, market: "6", side: "YES", price: 0.55, amt: 410},
        {h: 11, m: 7, b: 103, market: "5", side: "YES", price: 0.68, amt: 180},
        {h: 20, m: 39, b: 211, market: "3", side: "NO", price: 0.83, amt: 75},
        {h: 30, m: 14, b: 318, market: "7", side: "YES", price: 0.53, amt: 60},
    ];
    bettorTrace.forEach((d) => {
        items.push({
            id: `d-${(id++).toString().padStart(3, "0")}`,
            timestamp: ts(d.h, d.m),
            agentId: d.b,
            agentType: "Bettor",
            kind: "ENTER",
            marketId: d.market,
            payload: {side: d.side, amount: d.amt, price: d.price},
            txHash: txFor(id),
        });
    });

    // Oracle votes (other markets, not just the resolving one in hand-curated list)
    const oracleTrace: {h: number; m: number; o: number; market: string; outcome: "YES" | "NO" | "INVALID"; sources: [string, string]; reasoning: string}[] = [
        {h: 14, m: 22, o: 7, market: "1", outcome: "YES", sources: oracleSources[0], reasoning: "CPI print confirmed at 2.3% YoY. Threshold of 2.5% cleared with margin."},
        {h: 14, m: 24, o: 8, market: "1", outcome: "YES", sources: oracleSources[1], reasoning: "BLS release matches CoinGecko parsing. Confirmed YES."},
        {h: 14, m: 28, o: 9, market: "1", outcome: "YES", sources: oracleSources[2], reasoning: "BLS direct. Final reading 2.3%. Confirmed."},
        {h: 14, m: 32, o: 0, market: "1", outcome: "YES", sources: ["system", "system"], reasoning: ""},
    ];
    oracleTrace.forEach((d) => {
        const kind: "VOTE" | "FINALIZE" = d.o === 0 ? "FINALIZE" : "VOTE";
        items.push({
            id: `d-${(id++).toString().padStart(3, "0")}`,
            timestamp: ts(d.h, d.m),
            agentId: d.o,
            agentType: d.o === 0 ? "System" : "OracleNode",
            kind,
            marketId: d.market,
            payload: kind === "VOTE"
                ? {
                      outcome: d.outcome,
                      ipfsHash: `QmOracle${d.o}-${d.market}`,
                      reasoning: d.reasoning,
                      sources: d.sources,
                  }
                : {outcome: d.outcome},
            txHash: txFor(id),
        });
    });

    // Claims after the resolved market (id=1)
    const claimTrace: {h: number; m: number; b: number}[] = [
        {h: 13, m: 4, b: 103},
        {h: 13, m: 22, b: 211},
        {h: 14, m: 5, b: 442},
        {h: 19, m: 38, b: 318},
    ];
    claimTrace.forEach((d) => {
        items.push({
            id: `d-${(id++).toString().padStart(3, "0")}`,
            timestamp: ts(d.h, d.m),
            agentId: d.b,
            agentType: "Bettor",
            kind: "CLAIM",
            marketId: "1",
            payload: {},
            txHash: txFor(id),
        });
    });

    // Older market creations
    items.push({
        id: `d-${(id++).toString().padStart(3, "0")}`,
        timestamp: now - 12 * day,
        agentId: 0,
        agentType: "System",
        kind: "CREATE_MARKET",
        marketId: "5",
        payload: {},
        txHash: txFor(id),
    });
    items.push({
        id: `d-${(id++).toString().padStart(3, "0")}`,
        timestamp: now - 28 * day,
        agentId: 0,
        agentType: "System",
        kind: "CREATE_MARKET",
        marketId: "4",
        payload: {},
        txHash: txFor(id),
    });

    return items;
}

export const MOCK_ORACLE_VOTES: Record<string, OracleVote[]> = {
    "2": [
        {
            oracleAgentId: 7,
            marketId: "2",
            vote: "YES",
            sources: ["CoinGecko", "Binance"],
            reasoning:
                "BTC closed at $151,240 per CoinGecko spot at 23:59:59 UTC. Binance spot confirms within 0.4%. Threshold of $150,000 cleared with material margin.",
            ipfsHash: "QmOracle7Vote",
            submittedAt: now - 2 * 3_600_000,
        },
        {
            oracleAgentId: 8,
            marketId: "2",
            vote: "YES",
            sources: ["Kraken", "Coinbase"],
            reasoning:
                "Kraken settled $151,180. Coinbase $151,310. Both venues report consistent close above the $150,000 threshold.",
            ipfsHash: "QmOracle8Vote",
            submittedAt: now - 2 * 3_600_000 + 30_000,
        },
        {
            oracleAgentId: 9,
            marketId: "2",
            vote: "INVALID",
            sources: ["Cryptocompare", "Pyth"],
            reasoning:
                "Cryptocompare API returned 504 at the resolution timestamp. Pyth historical feed missing the final two minutes of trading. Cannot report a canonical close in good faith — defaulting to INVALID.",
            ipfsHash: "QmOracle9Vote",
            submittedAt: now - 2 * 3_600_000 + 90_000,
        },
    ],
};

export const MOCK_POSITIONS: Position[] = [
    {
        marketId: "7",
        bettor: "0x1ab2c3d4e5f60718293a4b5c6d7e8f9012345678",
        side: "YES",
        shares: 162,
        stakedUsdt0: 100,
        enteredAt: now - 3 * 3_600_000,
        enteredPrice: 0.55,
    },
];

export function findMarket(id: string) {
    return MOCK_MARKETS.find((m) => m.id === id);
}

export function decisionsForMarket(marketId: string) {
    return MOCK_DECISIONS.filter((d) => d.marketId === marketId).sort(
        (a, b) => b.timestamp - a.timestamp
    );
}

export function findAgent(id: number) {
    return MOCK_AGENTS.find((a) => a.id === id);
}
