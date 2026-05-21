"use client";

import Link from "next/link";
import {useEffect, useRef, useState} from "react";
import {motion} from "framer-motion";
import {ArrowRight, Sparkle} from "@phosphor-icons/react/dist/ssr";
import {Button} from "@/components/primitives/button";
import {Badge, LiveDot} from "@/components/primitives/badge";
import {OutcomeBar} from "@/components/markets/outcome-bar";
import {YieldBar} from "@/components/markets/yield-bar";
import {emblemFor} from "@/lib/emblem";

const REASONING =
    "Allora forecast 62% YES with high confidence. Current LMSR at 0.55 implies a 7% edge. Three Nansen-flagged smart-money wallets accumulated ETH this week. Sizing 1,500 USDT0 on YES, capped at 15% of vault.";

function Typewriter({text, speed = 20}: {text: string; speed?: number}) {
    const [shown, setShown] = useState("");
    const idx = useRef(0);
    useEffect(() => {
        idx.current = 0;
        setShown("");
        const id = setInterval(() => {
            idx.current += 1;
            if (idx.current >= text.length) {
                clearInterval(id);
                setShown(text);
                return;
            }
            setShown(text.slice(0, idx.current));
        }, speed);
        return () => clearInterval(id);
    }, [text, speed]);
    return (
        <span className="text-bone">
            {shown}
            <span className="term-cursor ml-0.5" />
        </span>
    );
}

export function Hero() {
    const [yesPrice, setYesPrice] = useState(0.55);
    const [showCard, setShowCard] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setShowCard(true), 1400);
        const t2 = setTimeout(() => setYesPrice(0.62), 2400);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    return (
        <section className="relative overflow-hidden">
            {/* Sparse dot field — drifts slowly in the background */}
            <div className="absolute inset-0 pointer-events-none opacity-90">
                <div className="absolute inset-0 dotfield animate-drift" />
            </div>

            {/* Vertical guide hairlines — print-style */}
            <div className="absolute inset-y-0 left-6 md:left-10 w-px bg-border-soft pointer-events-none" />
            <div className="absolute inset-y-0 right-6 md:right-10 w-px bg-border-soft pointer-events-none" />

            <div className="relative max-w-[1440px] mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-20 md:pb-28">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                    {/* LEFT — Editorial headline */}
                    <div className="lg:col-span-7">
                        <motion.h1
                            initial={{opacity: 0, y: 16}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.85, ease: [0.22, 1, 0.36, 1]}}
                            className="font-display text-display-xl text-bone font-extrabold text-balance"
                        >
                            Prediction markets where the{" "}
                            <span className="text-amber">collateral</span> earns yield while bets
                            are open
                            <span className="term-cursor ml-1.5 align-baseline" />
                        </motion.h1>

                        <motion.p
                            initial={{opacity: 0, y: 8}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                            className="mt-7 max-w-[58ch] text-body-lg leading-relaxed text-bone-soft text-pretty"
                        >
                            Bettors deposit USDT0. The vault rotates into{" "}
                            <span className="font-mono text-[15px] text-mint">sUSDe</span> or{" "}
                            <span className="font-mono text-[15px] text-violet">USDY</span>.
                            AI agents — gated by ERC-8004 — read Allora forecasts and Nansen flow
                            to size positions. A three-agent oracle swarm resolves on-chain.
                        </motion.p>

                        <motion.div
                            initial={{opacity: 0, y: 8}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1]}}
                            className="mt-10 flex flex-wrap items-center gap-3"
                        >
                            <Button asChild size="lg" variant="primary">
                                <Link href="/markets">
                                    Browse markets
                                    <ArrowRight
                                        size={14}
                                        weight="regular"
                                        className="transition-transform group-hover:translate-x-1"
                                    />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="secondary">
                                <Link href="/markets/new">Create a market</Link>
                            </Button>
                            <Link
                                href="#how"
                                className="ml-1 text-fg-mute hover:text-amber underline-draw font-mono uppercase tracking-eyebrow text-[11px] transition-colors"
                            >
                                How it works ↓
                            </Link>
                        </motion.div>

                        <motion.dl
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            transition={{duration: 0.6, delay: 0.6}}
                            className="mt-14 grid grid-cols-3 gap-6 max-w-lg"
                        >
                            {[
                                {k: "Active markets", v: "6", c: "text-bone"},
                                {k: "Top yield tier", v: "12%", c: "text-mint"},
                                {k: "Oracle quorum", v: "3/3", c: "text-amber"},
                            ].map((s) => (
                                <div key={s.k} className="border-l border-border pl-4 group">
                                    <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-1.5">
                                        {s.k}
                                    </dt>
                                    <dd
                                        className={`font-display text-3xl tabular leading-none font-extrabold ${s.c}`}
                                    >
                                        {s.v}
                                    </dd>
                                </div>
                            ))}
                        </motion.dl>
                    </div>

                    {/* RIGHT — Live terminal panel */}
                    <div className="lg:col-span-5 lg:sticky lg:top-28">
                        <motion.div
                            initial={{opacity: 0, y: 24}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1]}}
                            className="relative"
                        >
                            {/* Faint amber ember halo behind the panel */}
                            <div className="absolute -inset-4 bg-amber/[0.06] blur-3xl rounded-full pointer-events-none" />

                            {/* Frame */}
                            <div className="relative bg-surface border border-border shadow-lift terminal-frame">
                                {/* Header strip — terminal title bar */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-soft">
                                    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                                        <span className="ember-dot" />
                                        LIVE / MKT-007
                                    </span>
                                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-mint">
                                        sUSDe · 12% APY
                                    </span>
                                </div>

                                {/* Question */}
                                <div className="px-5 pt-5 pb-3">
                                    <p className="font-display font-bold text-2xl leading-snug text-bone">
                                        Will ETH close above $4,500 on July 15?
                                    </p>
                                </div>

                                {/* OutcomeBar */}
                                <div className="px-5 pb-4">
                                    <OutcomeBar yesPrice={yesPrice} noPrice={1 - yesPrice} size="md" />
                                </div>

                                <div className="mx-5 hairline" />

                                {/* YieldBar */}
                                <div className="px-5 py-4">
                                    <YieldBar accrued={0.0042} projected={0.0096} live />
                                </div>

                                <div className="mx-5 hairline" />

                                {/* AI reasoning card */}
                                <div className="px-5 py-4 min-h-[230px]">
                                    {showCard ? (
                                        <motion.div
                                            initial={{opacity: 0, y: 6}}
                                            animate={{opacity: 1, y: 0}}
                                            transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                                        >
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <img
                                                    src={emblemFor(42, "ink")}
                                                    alt=""
                                                    className="w-7 h-7 border border-border bg-surface-soft invert opacity-90"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bone">
                                                        Trader #42 / ENTER YES
                                                    </p>
                                                    <p className="text-[10px] font-mono text-fg-mute tabular">
                                                        1,500 USDT0 · 0.55 → 0.62
                                                    </p>
                                                </div>
                                                <Badge tone="amber" size="sm">
                                                    <Sparkle size={9} weight="fill" />
                                                    AI
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
                                                <div className="border border-border bg-night px-2.5 py-2">
                                                    <p className="font-mono text-[9px] uppercase tracking-eyebrow text-fg-mute mb-0.5">
                                                        Allora
                                                    </p>
                                                    <p className="font-mono tabular text-mint">
                                                        62% YES
                                                    </p>
                                                </div>
                                                <div className="border border-border bg-night px-2.5 py-2">
                                                    <p className="font-mono text-[9px] uppercase tracking-eyebrow text-fg-mute mb-0.5">
                                                        Nansen
                                                    </p>
                                                    <p className="font-mono tabular text-violet">
                                                        3 wallets long
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="text-[12.5px] leading-relaxed text-bone-soft border-l border-amber pl-3 max-h-[120px] overflow-hidden">
                                                <Typewriter text={REASONING} speed={16} />
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="skeleton h-6 w-2/3" />
                                            <div className="skeleton h-3 w-1/2" />
                                            <div className="skeleton h-16 w-full mt-3" />
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className="ember-dot animate-pulse" />
                                                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                                                    Trader agent thinking
                                                    <span className="term-cursor ml-1" />
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer strip */}
                                <div className="px-4 py-2 border-t border-border bg-surface-soft flex items-center justify-between">
                                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                                        VOL 12.4k · 18 POS
                                    </span>
                                    <Link
                                        href="/markets"
                                        className="font-mono text-[10px] uppercase tracking-eyebrow text-amber hover:text-amber-soft underline-draw"
                                    >
                                        Open ↗
                                    </Link>
                                </div>
                            </div>

                            {/* Caption */}
                            <p className="absolute -bottom-7 left-0 font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint">
                                ↑ live demonstration — animates on load
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
