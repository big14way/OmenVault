"use client";

import {useEffect, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ArrowSquareOut, CaretDown, Robot, Sparkle} from "@phosphor-icons/react/dist/ssr";
import {Badge} from "@/components/primitives/badge";
import {emblemFor} from "@/lib/emblem";
import {cn} from "@/lib/cn";
import {formatUsdt0, formatPercent, relativeTime} from "@/lib/format";

interface AgentReasoningCardProps {
    agentId: number;
    side: "YES" | "NO";
    amount: number;
    enteredPrice: number;
    timestamp: number;
    alloraForecast?: number;
    nansenWallets?: number;
    confidence?: number;
    reasoning: string;
    ipfsHash?: string;
    streamReasoning?: boolean;
    defaultOpen?: boolean;
}

function useTypewriter(text: string, enabled: boolean, speed = 14) {
    const [out, setOut] = useState(enabled ? "" : text);
    useEffect(() => {
        if (!enabled) {
            setOut(text);
            return;
        }
        let i = 0;
        setOut("");
        const id = setInterval(() => {
            i += 1;
            if (i >= text.length) {
                clearInterval(id);
                setOut(text);
                return;
            }
            setOut(text.slice(0, i));
        }, speed);
        return () => clearInterval(id);
    }, [text, enabled, speed]);
    return out;
}

export function AgentReasoningCard({
    agentId,
    side,
    amount,
    enteredPrice,
    timestamp,
    alloraForecast,
    nansenWallets,
    confidence,
    reasoning,
    ipfsHash,
    streamReasoning = false,
    defaultOpen = false,
}: AgentReasoningCardProps) {
    const [open, setOpen] = useState(defaultOpen);
    const [hasOpened, setHasOpened] = useState(defaultOpen);
    const typed = useTypewriter(reasoning, open && streamReasoning && !hasOpened);

    useEffect(() => {
        if (open) setHasOpened(true);
    }, [open]);

    const sideTone = side === "YES" ? "mint" : "coral";

    return (
        <article className="relative bg-surface border border-border group hover:border-border-strong transition-colors duration-300">
            {/* Top hairline accent — amber for AI cards */}
            <span className="absolute top-0 left-0 right-0 h-px bg-amber" />

            <button
                onClick={() => setOpen((s) => !s)}
                className="w-full text-left p-4 md:p-5 flex items-start gap-3"
            >
                <img
                    src={emblemFor(agentId, "ink")}
                    alt=""
                    className="w-9 h-9 border border-border bg-night invert opacity-90 shrink-0"
                />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-mono text-[11px] uppercase tracking-eyebrow text-bone">
                            TRADER #{agentId}
                        </span>
                        <Badge tone="amber" size="sm">
                            <Sparkle size={9} weight="fill" />
                            AI
                        </Badge>
                        <Badge tone={sideTone} size="sm">
                            ENTER {side}
                        </Badge>
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                            {relativeTime(timestamp)}
                        </span>
                    </div>

                    <p className="font-display font-bold text-lg text-bone leading-snug">
                        Entered{" "}
                        <span className="text-amber">{formatUsdt0(amount)} USDT0</span> on{" "}
                        <span className={side === "YES" ? "text-mint" : "text-coral"}>{side}</span>{" "}
                        @ {enteredPrice.toFixed(2)}
                    </p>
                </div>

                <CaretDown
                    size={14}
                    weight="regular"
                    className={cn(
                        "shrink-0 mt-1 text-fg-mute transition-transform duration-300",
                        open && "rotate-180"
                    )}
                />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="body"
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.35, ease: [0.22, 1, 0.36, 1]}}
                        className="overflow-hidden"
                    >
                        <div className="px-4 md:px-5 pb-5 -mt-1">
                            <div className="ml-12">
                                {/* Inputs grid */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <Tile
                                        label="Allora"
                                        value={
                                            alloraForecast != null
                                                ? `${(alloraForecast * 100).toFixed(0)}% YES`
                                                : "—"
                                        }
                                        accent="text-mint"
                                    />
                                    <Tile
                                        label="Nansen"
                                        value={
                                            nansenWallets != null
                                                ? `${nansenWallets} smart`
                                                : "—"
                                        }
                                        accent="text-violet"
                                    />
                                    <Tile
                                        label="Confidence"
                                        value={
                                            confidence != null
                                                ? formatPercent(confidence, {decimals: 0})
                                                : "—"
                                        }
                                        accent="text-amber"
                                    />
                                </div>

                                {/* Reasoning */}
                                <div className="border-l border-amber pl-4 bg-night-deep py-3 -mr-1">
                                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-2 inline-flex items-center gap-1.5">
                                        <Robot size={10} weight="regular" />
                                        Reasoning · claude-haiku-4-5
                                    </p>
                                    <p className="text-[14px] leading-relaxed text-bone">
                                        {typed}
                                        {streamReasoning && !hasOpened && open && (
                                            <span className="term-cursor ml-0.5" />
                                        )}
                                    </p>
                                </div>

                                {/* Footer */}
                                {ipfsHash && (
                                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                                        <a
                                            href={`https://gateway.pinata.cloud/ipfs/${ipfsHash.replace(/^ipfs:\/\//, "")}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute hover:text-amber"
                                        >
                                            <ArrowSquareOut size={11} weight="regular" />
                                            ipfs://{ipfsHash.replace(/^ipfs:\/\//, "").slice(0, 10)}…
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </article>
    );
}

function Tile({label, value, accent}: {label: string; value: string; accent: string}) {
    return (
        <div className="border border-border bg-night px-2.5 py-2">
            <p className="font-mono text-[9px] uppercase tracking-eyebrow text-fg-mute mb-1">
                {label}
            </p>
            <p className={cn("font-mono text-[12px] tabular", accent)}>{value}</p>
        </div>
    );
}
