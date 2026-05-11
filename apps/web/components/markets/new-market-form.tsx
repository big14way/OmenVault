"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {ArrowRight, Check, Warning} from "@phosphor-icons/react/dist/ssr";
import {Button} from "@/components/primitives/button";
import {TIER_APY, type CollateralTier, type Market} from "@/lib/types";
import {cn} from "@/lib/cn";

export type Template = "crypto" | "custom";
export type Direction = "above" | "below";
export type Underlying = "BTC" | "ETH" | "SOL";

export interface DraftState {
    template: Template;
    underlying: Underlying;
    direction: Direction;
    threshold: number;
    customQuestion: string;
    resolutionAt: number;
    tier: CollateralTier;
    minStakeUsdt0: number;
    liquidityB: number;
    alloraTopicId: string; // "" = none
}

// Build the draft Market that the preview renders.
export function buildDraftMarket(s: DraftState): Market {
    return {
        id: "preview",
        address: "0x" + "0".repeat(40),
        question: deriveQuestion(s),
        category: s.template === "crypto" ? "Crypto" : "Custom",
        tier: s.tier,
        yesPrice: 0.5,
        noPrice: 0.5,
        volumeUsdt0: 0,
        positionsCount: 0,
        aiTradersActive: 0,
        yieldEarned: 0,
        resolutionAt: s.resolutionAt,
        createdAt: Date.now(),
        status: "active",
        alloraTopicId: s.alloraTopicId || undefined,
        creator: "0xyou",
    };
}

export function deriveQuestion(s: DraftState): string {
    if (s.template === "custom") {
        return s.customQuestion.trim() || "Untitled market";
    }
    const dateStr = new Date(s.resolutionAt).toISOString().slice(0, 10);
    const fmt = new Intl.NumberFormat("en-US").format(s.threshold);
    return `Will ${s.underlying} close ${s.direction} $${fmt} on ${dateStr}?`;
}

const ALLORA_TOPICS: {id: string; label: string}[] = [
    {id: "", label: "none"},
    {id: "14", label: "topic 14 · ETH/USD"},
    {id: "1", label: "topic 1 · BTC/USD"},
    {id: "8", label: "topic 8 · SOL/USD"},
];

interface FormProps {
    state: DraftState;
    onChange: (next: DraftState) => void;
}

export function NewMarketForm({state, onChange}: FormProps) {
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
        onChange({...state, [key]: value});

    const isValid =
        (state.template === "crypto"
            ? state.threshold > 0 && state.resolutionAt > Date.now()
            : state.customQuestion.trim().length > 8 && state.resolutionAt > Date.now()) &&
        state.minStakeUsdt0 > 0 &&
        state.liquidityB > 0;

    const daysToResolve = Math.max(
        0,
        (state.resolutionAt - Date.now()) / 86_400_000
    );
    const projYield = (TIER_APY[state.tier] * daysToResolve) / 365;

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setSubmitting(true);
        toast("Market deployment queued", {
            description:
                "2 txs · MarketFactory.createMarket + CollateralVault.init. Will appear in /markets once block-confirmed. Wallet wiring pending — this is a mock.",
            duration: 6000,
        });
        // Redirect to the markets list — user lands somewhere useful while
        // they wait for the (mock) deployment. Real flow goes to /markets/[newId]
        // once the factory emits MarketCreated and we have the id.
        setTimeout(() => router.push("/markets"), 1200);
    };

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-12">
            {/* 01 — Question */}
            <Section
                index="01"
                title="The question"
                caption="What outcome resolves this market?"
            >
                <Row label="template">
                    <SegmentedRow
                        options={[
                            {key: "crypto", label: "crypto · threshold"},
                            {key: "custom", label: "custom · free-form"},
                        ]}
                        value={state.template}
                        onChange={(v) => update("template", v as Template)}
                    />
                </Row>

                {state.template === "crypto" ? (
                    <>
                        <Row label="underlying">
                            <SegmentedRow
                                options={[
                                    {key: "ETH", label: "ETH"},
                                    {key: "BTC", label: "BTC"},
                                    {key: "SOL", label: "SOL"},
                                ]}
                                value={state.underlying}
                                onChange={(v) => update("underlying", v as Underlying)}
                            />
                        </Row>

                        <Row label="direction">
                            <SegmentedRow
                                options={[
                                    {key: "above", label: "close above"},
                                    {key: "below", label: "close below"},
                                ]}
                                value={state.direction}
                                onChange={(v) => update("direction", v as Direction)}
                            />
                        </Row>

                        <Row label="threshold">
                            <div className="inline-flex items-center font-mono">
                                <span className="text-fg-mute pr-2">$</span>
                                <NumInput
                                    value={state.threshold}
                                    onChange={(v) => update("threshold", v)}
                                    step={100}
                                />
                            </div>
                        </Row>
                    </>
                ) : (
                    <Row label="question">
                        <textarea
                            value={state.customQuestion}
                            onChange={(e) => update("customQuestion", e.target.value)}
                            placeholder="Will the FOMC cut rates by 25bps at the July 2026 meeting?"
                            rows={2}
                            className="w-full bg-transparent border-b border-border-strong focus:border-amber transition-colors py-2 outline-none text-[15px] text-bone placeholder:text-fg-faint resize-none"
                        />
                    </Row>
                )}

                <Row label="resolves at">
                    <DateInput
                        value={state.resolutionAt}
                        onChange={(v) => update("resolutionAt", v)}
                    />
                    <span className="ml-3 font-mono text-[11px] text-fg-mute tabular">
                        {daysToResolve > 0
                            ? `${daysToResolve.toFixed(0)}d from now`
                            : "in the past — pick a future date"}
                    </span>
                </Row>
            </Section>

            {/* 02 — Collateral */}
            <Section
                index="02"
                title="Collateral"
                caption="Stake routes into this tier for the duration of the bet."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
                    {(
                        [
                            {key: "USDT0", apy: 0, desc: "Settlement only · no yield"},
                            {key: "USDY", apy: 0.05, desc: "Ondo T-bills · conservative"},
                            {key: "sUSDe", apy: 0.12, desc: "Ethena synth · max yield"},
                        ] as const
                    ).map((t) => {
                        const active = state.tier === t.key;
                        return (
                            <button
                                type="button"
                                key={t.key}
                                onClick={() => update("tier", t.key)}
                                className={cn(
                                    "relative bg-night p-5 text-left transition-colors group",
                                    active ? "bg-surface" : "hover:bg-surface"
                                )}
                            >
                                {active && (
                                    <span
                                        className="absolute top-0 left-0 right-0 h-px bg-amber"
                                        style={{boxShadow: "0 0 6px rgba(242, 163, 65, 0.5)"}}
                                    />
                                )}
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={cn(
                                            "font-mono text-[11px] uppercase tracking-eyebrow tabular",
                                            active ? "text-amber" : "text-bone"
                                        )}
                                    >
                                        {t.key}
                                    </span>
                                    {active && <Check size={12} weight="bold" className="text-amber" />}
                                </div>
                                <p
                                    className={cn(
                                        "font-display font-bold text-2xl tabular leading-none mb-1.5",
                                        t.apy > 0 ? "text-mint" : "text-fg-mute"
                                    )}
                                >
                                    {t.apy > 0 ? `${(t.apy * 100).toFixed(0)}%` : "—"}
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                                    {t.desc}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {projYield > 0 && (
                    <div className="mt-4 flex items-center justify-between font-mono text-[11px] tabular px-1">
                        <span className="text-fg-mute uppercase tracking-eyebrow">
                            Projected yield to resolution
                        </span>
                        <span className="text-mint">+{(projYield * 100).toFixed(2)}%</span>
                    </div>
                )}
            </Section>

            {/* 03 — Guardrails */}
            <Section
                index="03"
                title="Guardrails"
                caption="Anti-spam stake floor + LMSR liquidity parameter."
            >
                <Row label="min stake (USDT0)">
                    <NumInput
                        value={state.minStakeUsdt0}
                        onChange={(v) => update("minStakeUsdt0", v)}
                        step={5}
                    />
                </Row>
                <Row label="liquidity · b">
                    <NumInput
                        value={state.liquidityB}
                        onChange={(v) => update("liquidityB", v)}
                        step={100}
                    />
                    <span className="ml-3 font-mono text-[11px] text-fg-faint tabular">
                        higher = flatter price impact
                    </span>
                </Row>
            </Section>

            {/* 04 — AI signals */}
            <Section
                index="04"
                title="AI signals"
                caption="Optional Allora forecast topic. Traders read this signal to size positions."
            >
                <Row label="allora topic">
                    <select
                        value={state.alloraTopicId}
                        onChange={(e) => update("alloraTopicId", e.target.value)}
                        className="bg-transparent border-b border-border-strong focus:border-amber py-1.5 outline-none font-mono text-[13px] text-bone cursor-pointer"
                    >
                        {ALLORA_TOPICS.map((t) => (
                            <option key={t.id} value={t.id} className="bg-surface text-bone">
                                {t.label}
                            </option>
                        ))}
                    </select>
                </Row>
            </Section>

            <div className="border-t border-border pt-6 flex items-center justify-between gap-4 flex-wrap">
                {!isValid && (
                    <p className="flex items-center gap-2 font-mono text-[11px] text-fg-mute">
                        <Warning size={12} weight="regular" className="text-amber" />
                        Fill the question and pick a future resolution date.
                    </p>
                )}
                <div className="flex items-center gap-3 ml-auto">
                    <Button
                        type="button"
                        variant="dim"
                        size="md"
                        onClick={() => router.push("/markets")}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={!isValid || submitting}
                    >
                        {submitting ? "Deploying…" : "Approve & deploy"}
                        {!submitting && <ArrowRight size={13} weight="regular" />}
                    </Button>
                </div>
            </div>
        </form>
    );
}

function Section({
    index,
    title,
    caption,
    children,
}: {
    index: string;
    title: string;
    caption: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 border-t border-border-soft pt-8">
            <div className="md:col-span-3">
                <p className="font-mono text-2xl text-amber tabular leading-none mb-3">
                    {index}
                </p>
                <h2 className="font-display font-bold text-xl text-bone leading-tight">
                    {title}
                </h2>
                <p className="mt-2 font-mono text-[11px] text-fg-mute leading-relaxed">
                    {caption}
                </p>
            </div>
            <div className="md:col-span-9 space-y-5">{children}</div>
        </section>
    );
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-baseline">
            <span className="md:col-span-3 font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute pt-1.5">
                {label}
            </span>
            <div className="md:col-span-9 flex items-baseline flex-wrap">{children}</div>
        </div>
    );
}

function SegmentedRow<T extends string>({
    options,
    value,
    onChange,
}: {
    options: {key: T; label: string}[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="inline-flex flex-wrap gap-1.5">
            {options.map((o) => {
                const active = value === o.key;
                return (
                    <button
                        type="button"
                        key={o.key}
                        onClick={() => onChange(o.key)}
                        className={cn(
                            "px-3 h-8 border font-mono text-[11px] uppercase tracking-eyebrow transition-colors",
                            active
                                ? "border-amber bg-amber-glow text-amber"
                                : "border-border text-fg-mute hover:border-bone hover:text-bone"
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

function NumInput({
    value,
    onChange,
    step,
}: {
    value: number;
    onChange: (v: number) => void;
    step?: number;
}) {
    return (
        <input
            type="number"
            value={value}
            step={step ?? 1}
            min={0}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
            className="w-32 bg-transparent border-b border-border-strong focus:border-amber transition-colors py-1.5 outline-none font-mono text-[15px] tabular text-bone"
        />
    );
}

function DateInput({value, onChange}: {value: number; onChange: (v: number) => void}) {
    // datetime-local format YYYY-MM-DDTHH:MM in LOCAL time
    const d = new Date(value);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return (
        <input
            type="datetime-local"
            value={localIso}
            onChange={(e) => {
                const next = new Date(e.target.value);
                if (!isNaN(next.getTime())) onChange(next.getTime());
            }}
            className="bg-transparent border-b border-border-strong focus:border-amber transition-colors py-1.5 outline-none font-mono text-[13px] tabular text-bone w-48"
        />
    );
}
