"use client";

import {useState} from "react";
import Link from "next/link";
import {toast} from "sonner";
import {ArrowSquareOut, CheckCircle, Warning, XCircle} from "@phosphor-icons/react/dist/ssr";
import {Button} from "@/components/primitives/button";
import {cn} from "@/lib/cn";
import {formatUsdt0, relativeTime} from "@/lib/format";
import type {Market, Outcome} from "@/lib/types";

interface VerdictCaseProps {
    index: number; // 1-based docket number
    market: Market;
    oracleId: number;
}

// Each oracle reads a deterministic subset of canonical sources.
const ORACLE_SOURCES: Record<number, {label: string; reading: string; agrees: boolean}[]> = {
    7: [
        {label: "CoinGecko spot", reading: "queried 23:59:58 UTC", agrees: true},
        {label: "Binance spot", reading: "queried 23:59:59 UTC", agrees: true},
    ],
    8: [
        {label: "Kraken spot", reading: "queried 00:00:00 UTC", agrees: true},
        {label: "Coinbase spot", reading: "queried 00:00:01 UTC", agrees: true},
    ],
    9: [
        {label: "Cryptocompare", reading: "queried 00:00:02 UTC", agrees: true},
        {label: "Pyth historical", reading: "queried 00:00:00 UTC", agrees: false},
    ],
};

function defaultReasoning(market: Market, oracleId: number, suggestion: Outcome): string {
    const srcs = ORACLE_SOURCES[oracleId] ?? [{label: "primary source", reading: "queried at resolution", agrees: true}];
    const srcLabels = srcs.map((s) => s.label).join(" + ");
    if (suggestion === "INVALID") {
        return `${srcLabels} returned inconsistent or unavailable data at the resolution timestamp. Cannot report a canonical close in good faith — defaulting to INVALID.`;
    }
    return `${srcLabels} confirm the resolution. Threshold cleared with margin; signing ${suggestion}.`;
}

function suggestVerdict(market: Market, oracleId: number): Outcome {
    const srcs = ORACLE_SOURCES[oracleId] ?? [];
    const anyDisagrees = srcs.some((s) => !s.agrees);
    if (anyDisagrees) return "INVALID";
    // Heuristic: bias toward the side LMSR price favors at the moment of resolution.
    return market.yesPrice >= 0.5 ? "YES" : "NO";
}

export function VerdictCase({index, market, oracleId}: VerdictCaseProps) {
    const suggestion = suggestVerdict(market, oracleId);
    const sources = ORACLE_SOURCES[oracleId] ?? [];
    const [reasoning, setReasoning] = useState(defaultReasoning(market, oracleId, suggestion));
    const [verdict, setVerdict] = useState<Outcome>(suggestion);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState<Outcome | null>(null);

    const handleSign = (v: Outcome) => {
        setVerdict(v);
        setSigning(true);
        setTimeout(() => {
            setSigned(v);
            setSigning(false);
            toast("Verdict signed", {
                description: `Oracle #${oracleId} signed ${v} on MKT-${market.id.padStart(3, "0")}. Will broadcast once wallet connected — mock state.`,
                duration: 6000,
            });
        }, 800);
    };

    return (
        <article className="border-t border-border pt-7 pb-4">
            <header className="flex items-baseline justify-between gap-4 mb-5">
                <div className="flex items-baseline gap-4">
                    <span className="font-mono text-amber text-xl tabular leading-none">
                        {String(index).padStart(2, "0")}.
                    </span>
                    <Link
                        href={`/markets/${market.id}`}
                        className="font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute hover:text-amber underline-draw tabular"
                    >
                        mkt-{market.id.padStart(3, "0")}
                    </Link>
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-faint tabular">
                    resolution hit {relativeTime(market.resolutionAt)}
                </span>
            </header>

            <h3 className="font-display font-bold text-[22px] text-bone leading-snug mb-6 max-w-[60ch] text-balance">
                {market.question}
            </h3>

            {/* Sources */}
            <div className="mb-6">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-3">
                    Canonical sources · oracle #{oracleId}
                </p>
                <ul className="border-l border-border-soft pl-4 space-y-1.5">
                    {sources.map((s) => (
                        <li
                            key={s.label}
                            className="flex items-baseline justify-between font-mono text-[12px] tabular"
                        >
                            <span className="text-bone-soft">{s.label}</span>
                            <span className="text-fg-faint mx-3 flex-1 truncate">
                                {s.reading}
                            </span>
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 text-[11px]",
                                    s.agrees ? "text-mint" : "text-coral"
                                )}
                            >
                                {s.agrees ? (
                                    <>
                                        <CheckCircle size={10} weight="regular" />
                                        consistent
                                    </>
                                ) : (
                                    <>
                                        <Warning size={10} weight="regular" />
                                        unavailable
                                    </>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Suggested verdict + selector */}
            <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-3">
                    Verdict · suggested{" "}
                    <span
                        className={cn(
                            suggestion === "YES" && "text-mint",
                            suggestion === "NO" && "text-coral",
                            suggestion === "INVALID" && "text-fg-mute"
                        )}
                    >
                        {suggestion}
                    </span>
                </p>
                <div className="inline-flex gap-1.5">
                    {(["YES", "NO", "INVALID"] as const).map((opt) => {
                        const active = verdict === opt;
                        return (
                            <button
                                type="button"
                                key={opt}
                                onClick={() => {
                                    setVerdict(opt);
                                    setReasoning(defaultReasoning(market, oracleId, opt));
                                }}
                                disabled={signed !== null}
                                className={cn(
                                    "px-4 h-9 border font-mono text-[11px] uppercase tracking-eyebrow transition-colors disabled:opacity-50 disabled:pointer-events-none",
                                    active
                                        ? opt === "YES"
                                            ? "border-mint bg-mint-glow text-mint"
                                            : opt === "NO"
                                              ? "border-coral bg-coral-glow text-coral"
                                              : "border-border-strong bg-surface text-bone"
                                        : "border-border text-fg-mute hover:border-bone hover:text-bone"
                                )}
                            >
                                {opt === "YES" && <CheckCircle size={10} weight="regular" className="inline mr-1.5" />}
                                {opt === "NO" && <XCircle size={10} weight="regular" className="inline mr-1.5" />}
                                {opt === "INVALID" && <Warning size={10} weight="regular" className="inline mr-1.5" />}
                                {opt}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Reasoning textarea */}
            <div className="mb-6">
                <div className="flex items-baseline justify-between mb-2">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                        Reasoning · IPFS-pinned on signature
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint tabular">
                        {reasoning.length} chars
                    </p>
                </div>
                <textarea
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    disabled={signed !== null}
                    rows={3}
                    className="w-full bg-night border border-border-soft focus:border-amber transition-colors p-3 outline-none text-[13.5px] text-bone resize-none font-display disabled:opacity-60"
                />
            </div>

            {/* Sign actions */}
            {signed !== null ? (
                <div className="flex items-center justify-between gap-3 py-3 px-4 border border-amber/40 bg-amber-glow">
                    <span className="font-mono text-[11px] uppercase tracking-eyebrow text-amber inline-flex items-center gap-2">
                        <CheckCircle size={12} weight="bold" />
                        Signed {signed} · mkt-{market.id.padStart(3, "0")}
                    </span>
                    <a
                        href="https://ipfs.io/ipfs/Qm0000000000"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute hover:text-amber"
                    >
                        <ArrowSquareOut size={11} weight="regular" />
                        reasoning ipfs
                    </a>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-mono text-[10.5px] text-fg-faint tabular">
                        Signing broadcasts the verdict + IPFS-pinned reasoning to the swarm.
                    </p>
                    <Button
                        size="md"
                        variant="primary"
                        disabled={signing}
                        onClick={() => handleSign(verdict)}
                    >
                        {signing ? "Signing…" : `Sign ${verdict}`}
                    </Button>
                </div>
            )}
        </article>
    );
}
