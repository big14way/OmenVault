"use client";

import {motion, useInView} from "framer-motion";
import {useRef} from "react";

const STEPS = [
    {
        n: "01",
        title: "Deposit",
        body: "Bettor deposits USDT0 into a per-market vault. The amount is exact — no spread, no slippage on the deposit leg.",
        cap: "USDT0",
    },
    {
        n: "02",
        title: "Rotate",
        body: "Vault converts to the market's collateral tier. sUSDe stakes into Ethena. USDY mints Ondo T-bills. USDT0-only sits idle.",
        cap: "→ sUSDe / USDY",
    },
    {
        n: "03",
        title: "Bet",
        body: "LMSR mints YES or NO shares against the position. Agents read Allora forecasts and Nansen flow to size their entries.",
        cap: "LMSR shares",
    },
    {
        n: "04",
        title: "Yield",
        body: "While the market is open, the RWA position accrues yield in real time. vaultValue() grows with every block.",
        cap: "Yield accrues",
    },
    {
        n: "05",
        title: "Resolve",
        body: "Three independent ERC-8004 oracle agents post signed verdicts. Majority wins. Tied 1-1-1 reverts. Reputation updates on-chain.",
        cap: "3-of-3 swarm",
    },
    {
        n: "06",
        title: "Claim",
        body: "Vault unwinds the RWA back to USDT0. Winners receive principal + LMSR upside + a pro-rata share of the yield earned.",
        cap: "USDT0 + yield",
    },
];

function LifecyclePath() {
    const ref = useRef<SVGSVGElement>(null);
    const inView = useInView(ref, {once: true, margin: "-30%"});

    return (
        <svg
            ref={ref}
            viewBox="0 0 1200 120"
            className="w-full h-auto overflow-visible"
            preserveAspectRatio="none"
        >
            <defs>
                <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#F2A341" />
                </marker>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background guide line — faint */}
            <path
                d="M 30 60 C 200 20, 400 100, 600 60 S 1000 20, 1170 60"
                fill="none"
                stroke="#262A33"
                strokeWidth="1"
                strokeDasharray="3 4"
            />

            {/* Animated foreground line */}
            <motion.path
                d="M 30 60 C 200 20, 400 100, 600 60 S 1000 20, 1170 60"
                fill="none"
                stroke="#F2A341"
                strokeWidth="1.5"
                pathLength={1}
                initial={{pathLength: 0}}
                animate={inView ? {pathLength: 1} : {}}
                transition={{duration: 2.4, ease: [0.22, 1, 0.36, 1]}}
                markerEnd="url(#arrow)"
                filter="url(#glow)"
            />

            {/* Six nodes */}
            {[
                {x: 30, y: 60},
                {x: 260, y: 50},
                {x: 470, y: 78},
                {x: 700, y: 52},
                {x: 940, y: 30},
                {x: 1170, y: 60},
            ].map((p, i) => (
                <motion.g
                    key={i}
                    initial={{scale: 0, opacity: 0}}
                    animate={inView ? {scale: 1, opacity: 1} : {}}
                    transition={{
                        duration: 0.5,
                        delay: 0.2 + i * 0.32,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{transformOrigin: `${p.x}px ${p.y}px`}}
                >
                    <circle cx={p.x} cy={p.y} r="6" fill="#0C0D11" stroke="#F2A341" strokeWidth="1.5" />
                    <circle cx={p.x} cy={p.y} r="2.4" fill="#F2A341" filter="url(#glow)" />
                </motion.g>
            ))}
        </svg>
    );
}

export function HowItWorks() {
    return (
        <section id="how" className="relative py-24 md:py-32">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="max-w-2xl mb-16">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-amber mb-5">
                        How it works
                    </p>
                    <h2 className="font-display font-extrabold text-display-lg text-bone text-balance">
                        From deposit to <span className="text-amber">payout</span>, in six on-chain
                        steps.
                    </h2>
                </div>

                {/* Lifecycle SVG */}
                <div className="hidden md:block mb-16 px-4">
                    <LifecyclePath />
                </div>

                {/* Steps grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
                    {STEPS.map((s, i) => (
                        <motion.div
                            key={s.n}
                            initial={{opacity: 0, y: 12}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true, margin: "-40px"}}
                            transition={{duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1]}}
                            className="bg-night p-7 md:p-8 group hover:bg-surface transition-colors duration-500"
                        >
                            <div className="flex items-baseline justify-between mb-5">
                                <span className="font-mono text-2xl text-amber tabular">
                                    {s.n}
                                </span>
                                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                                    {s.cap}
                                </span>
                            </div>
                            <h3 className="font-display font-bold text-2xl text-bone mb-3 group-hover:text-amber transition-colors duration-300">
                                {s.title}
                            </h3>
                            <p className="text-bone-soft text-[14px] leading-relaxed">{s.body}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
