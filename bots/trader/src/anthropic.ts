/**
 * LLM wrapper for trader decisions. Despite the filename, this file dispatches
 * between providers based on env so index.ts can keep its existing import:
 *
 *   LLM_PROVIDER=groq      → Groq (OpenAI-compatible REST, no SDK needed)
 *   LLM_PROVIDER=anthropic → Anthropic (default if unset and ANTHROPIC_API_KEY present)
 *   (provider key missing) → deterministic heuristic fallback
 *
 * The heuristic fallback always runs if no key is configured for the selected
 * provider, so smoke tests and CI keep working without paid API credits.
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

type Provider = "groq" | "anthropic" | "heuristic";

function chooseProvider(): Provider {
    const explicit = (process.env.LLM_PROVIDER ?? "").toLowerCase();
    const hasGroq = Boolean(process.env.GROQ_API_KEY);
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
    if (explicit === "groq") return hasGroq ? "groq" : "heuristic";
    if (explicit === "anthropic") return hasAnthropic ? "anthropic" : "heuristic";
    // No explicit preference — pick whichever key is set, preferring Groq (free tier).
    if (hasGroq) return "groq";
    if (hasAnthropic) return "anthropic";
    return "heuristic";
}

export async function decide(input: DecisionInput): Promise<Decision> {
    const provider = chooseProvider();
    if (provider === "groq") return decideGroq(input);
    if (provider === "anthropic") return decideAnthropic(input);
    return mockDecide(input);
}

async function decideAnthropic(input: DecisionInput): Promise<Decision> {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
    const client = new Anthropic({apiKey});
    const userPrompt = buildUserPrompt(input);

    const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{role: "user", content: userPrompt}],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
        throw new Error("Anthropic returned no text content");
    }
    return parseDecisionJson(textBlock.text);
}

async function decideGroq(input: DecisionInput): Promise<Decision> {
    const apiKey = process.env.GROQ_API_KEY!;
    const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
    const userPrompt = buildUserPrompt(input);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model,
            max_tokens: 1024,
            // OpenAI-compatible JSON mode — model must return valid JSON.
            response_format: {type: "json_object"},
            messages: [
                {role: "system", content: SYSTEM_PROMPT},
                {role: "user", content: userPrompt},
            ],
        }),
        signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {choices?: {message?: {content?: string}}[]};
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned no message content");
    return parseDecisionJson(text);
}

function parseDecisionJson(raw: string): Decision {
    // Models are instructed to return strict JSON. Strip code fences if added.
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

/// Deterministic fallback used when neither provider has a key configured.
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
