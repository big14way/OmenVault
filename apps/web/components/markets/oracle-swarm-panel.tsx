"use client";

import {motion} from "framer-motion";
import {ArrowSquareOut, CheckCircle, Warning, XCircle} from "@phosphor-icons/react/dist/ssr";
import {Button} from "@/components/primitives/button";
import {emblemFor} from "@/lib/emblem";
import {cn} from "@/lib/cn";
import {shortAddress} from "@/lib/format";
import type {OracleVote, Outcome} from "@/lib/types";
import {findAgent} from "@/lib/mock-data";

const OUTCOME_TONE: Record<
    Outcome,
    {bg: string; text: string; border: string; glow: string; Icon: typeof CheckCircle}
> = {
    YES: {
        bg: "bg-mint-glow",
        text: "text-mint",
        border: "border-mint",
        glow: "shadow-glow-mint",
        Icon: CheckCircle,
    },
    NO: {
        bg: "bg-coral-glow",
        text: "text-coral",
        border: "border-coral",
        glow: "shadow-glow-coral",
        Icon: XCircle,
    },
    INVALID: {
        bg: "bg-surface-soft",
        text: "text-fg-mute",
        border: "border-border-strong",
        glow: "",
        Icon: Warning,
    },
};

interface OracleSwarmPanelProps {
    marketId: string;
    votes: OracleVote[];
    onFinalize?: () => void;
    finalized?: boolean;
    finalOutcome?: Outcome;
}

function tally(votes: OracleVote[]): Outcome | "TIE" | null {
    const counts: Record<Outcome, number> = {YES: 0, NO: 0, INVALID: 0};
    votes.forEach((v) => {
        counts[v.vote] += 1;
    });
    const sorted = (Object.entries(counts) as [Outcome, number][]).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === sorted[1][1]) return "TIE";
    return sorted[0][0];
}

export function OracleSwarmPanel({
    marketId: _marketId,
    votes,
    onFinalize,
    finalized,
    finalOutcome,
}: OracleSwarmPanelProps) {
    const majority = finalOutcome ?? (tally(votes) as Outcome | "TIE" | null);
    const isTie = majority === "TIE";
    const allIn = votes.length === 3;

    return (
        <div className="border border-border bg-night-deep relative overflow-hidden">
            {/* Top accent */}
            <span className="absolute top-0 left-0 right-0 h-px bg-violet" />

            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-violet mb-1">
                        Oracle swarm · resolution
                    </p>
                    <p className="font-display font-bold text-2xl text-bone">
                        Three independent verdicts.{" "}
                        <span className="text-amber">Majority wins.</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow tabular">
                    <span className="text-fg-mute">{votes.length}/3 voted</span>
                    {!finalized && allIn && !isTie && onFinalize && (
                        <Button size="sm" variant="primary" onClick={onFinalize}>
                            Finalize
                        </Button>
                    )}
                </div>
            </div>

            {/* Three oracle cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
                {[0, 1, 2].map((i) => {
                    const v = votes[i];
                    return v ? (
                        <OracleCard key={i} vote={v} index={i} />
                    ) : (
                        <PendingCard key={`p-${i}`} index={i} />
                    );
                })}
            </div>

            {/* Result rule */}
            {allIn && (
                <div className="relative px-5 py-7 bg-night">
                    <motion.div
                        initial={{scaleX: 0}}
                        animate={{scaleX: 1}}
                        transition={{duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1]}}
                        className="absolute top-0 left-0 right-0 h-px bg-amber origin-left"
                        style={{boxShadow: "0 0 6px rgba(242, 163, 65, 0.6)"}}
                    />
                    <motion.div
                        initial={{opacity: 0, y: 6}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.5, delay: 1.2}}
                        className="text-center"
                    >
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-amber mb-3">
                            {finalized ? "Finalized" : "Tally"}
                        </p>
                        <p className="font-display font-extrabold text-display-md text-bone leading-none">
                            {isTie ? (
                                <span className="text-fg-mute">Disagreement · re-vote</span>
                            ) : (
                                <>
                                    Majority{" "}
                                    <span
                                        className={cn(
                                            majority === "YES" && "text-mint",
                                            majority === "NO" && "text-coral",
                                            majority === "INVALID" && "text-fg-mute"
                                        )}
                                    >
                                        {majority}
                                    </span>
                                </>
                            )}
                        </p>
                        {!isTie && (
                            <p className="mt-2 font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute tabular">
                                {votes.filter((v) => v.vote === majority).length} of 3 aligned
                            </p>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function OracleCard({vote, index}: {vote: OracleVote; index: number}) {
    const tone = OUTCOME_TONE[vote.vote];
    const agent = findAgent(vote.oracleAgentId);

    return (
        <motion.article
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, delay: index * 0.4, ease: [0.22, 1, 0.36, 1]}}
            className={cn("relative bg-night p-5 flex flex-col gap-4 min-h-[280px]")}
        >
            <div className="flex items-center gap-3">
                <img
                    src={emblemFor(vote.oracleAgentId, "twilight")}
                    alt=""
                    className="w-10 h-10 border border-border bg-surface invert opacity-90"
                />
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-eyebrow text-violet">
                        ORACLE #{vote.oracleAgentId}
                    </p>
                    <p className="font-mono text-[10px] text-fg-mute tabular">
                        {agent ? shortAddress(agent.owner) : ""}
                    </p>
                </div>
            </div>

            <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-1.5">
                    Sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {vote.sources.map((s) => (
                        <span
                            key={s}
                            className="px-1.5 py-0.5 border border-border-strong text-[10px] font-mono uppercase tracking-eyebrow text-bone-soft"
                        >
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            <p className="text-[12.5px] leading-relaxed text-bone-soft flex-1">
                "{vote.reasoning}"
            </p>

            {/* Stamp */}
            <motion.div
                initial={{opacity: 0, scale: 1.4, rotate: -8}}
                animate={{opacity: 1, scale: 1, rotate: -1.5}}
                transition={{
                    duration: 0.45,
                    delay: index * 0.4 + 0.55,
                    ease: [0.34, 1.56, 0.64, 1],
                }}
                className="self-start"
            >
                <div
                    className={cn(
                        "stamp px-3 py-1.5 border-2 inline-flex items-center gap-1.5 transition-shadow",
                        tone.bg,
                        tone.text,
                        tone.border,
                        tone.glow
                    )}
                >
                    <tone.Icon size={12} weight="regular" />
                    <span className="font-display font-bold text-base normal-case tracking-normal">
                        {vote.vote}
                    </span>
                </div>
            </motion.div>

            {/* IPFS link */}
            <a
                href={`https://ipfs.io/ipfs/${vote.ipfsHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute hover:text-amber"
            >
                <ArrowSquareOut size={11} weight="regular" />
                Reasoning ↗
            </a>
        </motion.article>
    );
}

function PendingCard({index}: {index: number}) {
    return (
        <div className="bg-night p-5 flex flex-col gap-4 min-h-[280px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 skeleton" />
                <div className="space-y-1.5 flex-1">
                    <div className="skeleton h-3 w-20" />
                    <div className="skeleton h-2 w-16" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="skeleton h-2 w-12" />
                <div className="flex gap-1.5">
                    <div className="skeleton h-5 w-16" />
                    <div className="skeleton h-5 w-14" />
                </div>
            </div>
            <div className="space-y-1.5 flex-1">
                <div className="skeleton h-2.5 w-full" />
                <div className="skeleton h-2.5 w-5/6" />
                <div className="skeleton h-2.5 w-4/6" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                Awaiting oracle #{index + 1}
                <span className="term-cursor ml-1" />
            </p>
        </div>
    );
}
