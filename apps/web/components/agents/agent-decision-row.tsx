"use client";

import {useState} from "react";
import Link from "next/link";
import {AnimatePresence, motion} from "framer-motion";
import {ArrowSquareOut, CaretDown} from "@phosphor-icons/react/dist/ssr";
import {cn} from "@/lib/cn";
import {formatPercent, formatUsdt0, relativeTime} from "@/lib/format";
import type {Decision} from "@/lib/types";

interface Props {
    decision: Decision;
}

const KIND_COLOR = {
    ENTER_YES: "text-mint",
    ENTER_NO: "text-coral",
    VOTE_YES: "text-mint",
    VOTE_NO: "text-coral",
    VOTE_INVALID: "text-fg-mute",
    CLAIM: "text-mint",
    FINALIZE: "text-amber",
    OTHER: "text-bone",
};

function describe(d: Decision) {
    if (d.kind === "ENTER") {
        const side = d.payload.side ?? "YES";
        return {
            label: "ENTER",
            sub: side,
            color: side === "YES" ? KIND_COLOR.ENTER_YES : KIND_COLOR.ENTER_NO,
        };
    }
    if (d.kind === "VOTE") {
        const out = d.payload.outcome ?? "YES";
        return {
            label: "VOTE",
            sub: out,
            color:
                out === "YES"
                    ? KIND_COLOR.VOTE_YES
                    : out === "NO"
                      ? KIND_COLOR.VOTE_NO
                      : KIND_COLOR.VOTE_INVALID,
        };
    }
    if (d.kind === "CLAIM") return {label: "CLAIM", sub: "", color: KIND_COLOR.CLAIM};
    if (d.kind === "FINALIZE")
        return {label: "FINAL", sub: d.payload.outcome ?? "", color: KIND_COLOR.FINALIZE};
    if (d.kind === "CREATE_MARKET")
        return {label: "CREATE", sub: "", color: KIND_COLOR.OTHER};
    return {label: d.kind, sub: "", color: KIND_COLOR.OTHER};
}

export function AgentDecisionRow({decision}: Props) {
    const [open, setOpen] = useState(false);
    const d = describe(decision);
    const reasoning = decision.payload.reasoning;
    const hasDetail = Boolean(reasoning) || decision.payload.alloraForecast != null;

    return (
        <div className="border-b border-border-soft last:border-b-0">
            <button
                type="button"
                onClick={() => hasDetail && setOpen((s) => !s)}
                className={cn(
                    "w-full flex items-start gap-4 md:gap-6 px-4 md:px-6 py-3.5 text-left transition-colors",
                    hasDetail ? "hover:bg-surface cursor-pointer" : "cursor-default"
                )}
            >
                {/* Time */}
                <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-faint tabular shrink-0 w-14 mt-0.5">
                    {relativeTime(decision.timestamp).replace(" ago", "")}
                </span>

                {/* Action */}
                <span className="font-mono text-[11px] uppercase tracking-eyebrow tabular shrink-0 w-32 mt-0.5">
                    <span className="text-bone">{d.label}</span>{" "}
                    {d.sub && <span className={d.color}>{d.sub}</span>}
                </span>

                {/* Market */}
                {decision.marketId ? (
                    <Link
                        href={`/markets/${decision.marketId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute hover:text-amber underline-draw shrink-0 w-20 mt-0.5 tabular"
                    >
                        mkt-{decision.marketId.padStart(3, "0")}
                    </Link>
                ) : (
                    <span className="w-20 shrink-0" />
                )}

                {/* Amount/price (or reasoning excerpt) */}
                <span className="flex-1 min-w-0 text-[13px] text-bone-soft mt-0">
                    {decision.payload.amount != null && (
                        <span className="font-mono tabular text-bone shrink-0 mr-3">
                            {formatUsdt0(decision.payload.amount, {compact: true})} USDT0
                            {decision.payload.price != null && (
                                <span className="text-fg-faint ml-2">
                                    @ {decision.payload.price.toFixed(2)}
                                </span>
                            )}
                        </span>
                    )}
                    {reasoning && (
                        <span className={cn("text-bone-soft", !open && "truncate inline-block max-w-full align-bottom")}>
                            {!open && '"'}
                            {reasoning.length > 100 && !open
                                ? reasoning.slice(0, 100).trim() + "…"
                                : !open
                                  ? reasoning
                                  : ""}
                            {!open && '"'}
                        </span>
                    )}
                </span>

                {/* Caret */}
                {hasDetail && (
                    <CaretDown
                        size={12}
                        weight="regular"
                        className={cn(
                            "shrink-0 mt-1 text-fg-mute transition-transform duration-300",
                            open && "rotate-180"
                        )}
                    />
                )}
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.3, ease: [0.22, 1, 0.36, 1]}}
                        className="overflow-hidden bg-night-deep"
                    >
                        <div className="px-4 md:px-6 py-4 ml-[8.5rem]">
                            {/* Inputs */}
                            {(decision.payload.alloraForecast != null ||
                                decision.payload.nansenWallets != null ||
                                decision.payload.confidence != null) && (
                                <dl className="flex flex-wrap gap-x-6 gap-y-1.5 mb-3 font-mono text-[11px] tabular">
                                    {decision.payload.alloraForecast != null && (
                                        <Cell
                                            label="allora"
                                            value={`${(decision.payload.alloraForecast * 100).toFixed(0)}%`}
                                            accent="text-mint"
                                        />
                                    )}
                                    {decision.payload.nansenWallets != null && (
                                        <Cell
                                            label="nansen"
                                            value={`${decision.payload.nansenWallets} wallets`}
                                            accent="text-violet"
                                        />
                                    )}
                                    {decision.payload.confidence != null && (
                                        <Cell
                                            label="conf."
                                            value={formatPercent(decision.payload.confidence, {
                                                decimals: 0,
                                            })}
                                            accent="text-amber"
                                        />
                                    )}
                                </dl>
                            )}

                            {reasoning && (
                                <div className="border-l border-amber pl-4 py-1">
                                    <p className="text-[13px] leading-relaxed text-bone">
                                        {reasoning}
                                    </p>
                                </div>
                            )}

                            {decision.payload.ipfsHash && (
                                <a
                                    href={`https://ipfs.io/ipfs/${decision.payload.ipfsHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute hover:text-amber"
                                >
                                    <ArrowSquareOut size={11} weight="regular" />
                                    ipfs://{decision.payload.ipfsHash.slice(0, 12)}…
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Cell({label, value, accent}: {label: string; value: string; accent: string}) {
    return (
        <div>
            <span className="text-fg-mute uppercase tracking-eyebrow text-[9px] mr-1.5">
                {label}
            </span>
            <span className={accent}>{value}</span>
        </div>
    );
}
