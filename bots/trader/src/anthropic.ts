/**
 * Anthropic claude-haiku-4-5 wrapper for trader decisions.
 *
 * Falls back to a deterministic heuristic when ANTHROPIC_API_KEY is unset, so
 * the bot stays demoable in CI / smoke without burning API credits.
 */

import Anthropic from "@anthropic-ai/sdk";
import {SYSTEM_PROMPT, buildUserPrompt} from "./prompt.js";

export interface DecisionInput {
    question: string;
    priceYesE18: bigint;
    priceNoE18: bigint;
    alloraForecastYesE18: bigint;
    smartMoneyYes: number;
    smartMoneyNo: number;
    maxBetUsdt0: bigint;
}

export interface Decision {
    action: "ENTER" | "PASS";
    side: "YES" | "NO";
    sizeUsdt0: bigint;
    confidence: number;
    reasoning: string;
}

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

export async function decide(input: DecisionInput): Promise<Decision> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return mockDecide(input);
    }

    const client = new Anthropic({apiKey});
    const userPrompt = buildUserPrompt(input);

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{role: "user", content: userPrompt}],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
        throw new Error("Anthropic returned no text content");
    }

    return parseDecisionJson(textBlock.text, input);
}

function parseDecisionJson(raw: string, input: DecisionInput): Decision {
    // The model is instructed to return strict JSON. Strip code fences if it added them.
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
    const obj = JSON.parse(cleaned);
    return {
        action: obj.action === "ENTER" ? "ENTER" : "PASS",
        side: obj.side === "NO" ? "NO" : "YES",
        sizeUsdt0: BigInt(obj.sizeUsdt0 ?? 0),
        confidence: Number(obj.confidence ?? 0),
        reasoning: String(obj.reasoning ?? "(no reasoning provided)"),
    };
}

/// Deterministic fallback used when ANTHROPIC_API_KEY is unset.
/// Implements the same edge/confidence rules as the system prompt so smoke runs
/// without external API calls still produce a credible decision.
function mockDecide(input: DecisionInput): Decision {
    const pYes = Number(input.priceYesE18) / 1e18;
    const fYes = Number(input.alloraForecastYesE18) / 1e18;
    const edge = Math.abs(fYes - pYes);
    const flowSkew = input.smartMoneyYes - input.smartMoneyNo;
    const flowConf = Math.min(0.3, Math.abs(flowSkew) * 0.05);
    const confidence = Math.min(1, edge * 4 + flowConf + 0.3);

    if (edge < 0.05 || confidence < 0.6) {
        return {
            action: "PASS",
            side: fYes > pYes ? "YES" : "NO",
            sizeUsdt0: 0n,
            confidence,
            reasoning:
                `[heuristic] Edge ${(edge * 100).toFixed(1)}% / confidence ${confidence.toFixed(2)} below ` +
                `entry threshold (5% edge, 0.6 confidence). Holding.`,
        };
    }

    const side = fYes > pYes ? "YES" : "NO";
    const sizeUsdt0 = BigInt(Math.floor(Number(input.maxBetUsdt0) * Math.min(1, edge * confidence * 4)));
    return {
        action: "ENTER",
        side,
        sizeUsdt0,
        confidence,
        reasoning:
            `[heuristic] Allora P(YES)=${(fYes * 100).toFixed(1)}% vs market ${(pYes * 100).toFixed(1)}% — ` +
            `${(edge * 100).toFixed(1)}% edge on ${side}. Smart-money flow ${flowSkew > 0 ? "+" : ""}${flowSkew}. ` +
            `Sizing ${(Number(sizeUsdt0) / 1e6).toFixed(2)} USDT0 (cap-bounded by maxBet * edge * confidence).`,
    };
}
