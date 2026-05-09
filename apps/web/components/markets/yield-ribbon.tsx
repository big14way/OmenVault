"use client";

import {useEffect, useRef, useState} from "react";
import {motion} from "framer-motion";
import {ArrowUp, Coins} from "@phosphor-icons/react/dist/ssr";
import {cn} from "@/lib/cn";

interface YieldRibbonProps {
    accrued: number; // 0..1
    projected?: number; // 0..1 — projected yield at resolution
    apy: number; // 0 if no yield tier
    className?: string;
}

/**
 * The signature element of every market card. A live, ticking yield strip
 * that visually anchors the card and tells you: this market is earning while
 * you read it. Uses rAF for smooth sub-frame ticking; 6 decimals on display
 * so the change is visible per second (12% APY ≈ 0.0000004% / sec).
 */
export function YieldRibbon({accrued, projected, apy, className}: YieldRibbonProps) {
    const [tick, setTick] = useState(accrued);
    const startedAt = useRef<number>(0);
    const startAccrued = useRef<number>(accrued);

    useEffect(() => {
        if (apy <= 0) {
            setTick(accrued);
            return;
        }
        startedAt.current = performance.now();
        startAccrued.current = accrued;
        let raf = 0;
        const update = () => {
            const elapsedSec = (performance.now() - startedAt.current) / 1000;
            const drift = (apy / 31_536_000) * elapsedSec;
            setTick(startAccrued.current + drift);
            raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [accrued, apy]);

    if (apy <= 0) {
        return (
            <div
                className={cn(
                    "relative w-full px-4 py-2.5 border-t border-border bg-night-deep flex items-center justify-between",
                    className
                )}
            >
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint">
                    Settlement only · No yield tier
                </span>
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint tabular">
                    USDT0
                </span>
            </div>
        );
    }

    const proj = projected ?? Math.max(accrued * 6, 0.005);
    const pct = Math.min(100, (tick / proj) * 100);

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden border-t border-mint/30",
                className
            )}
            style={{
                background: "linear-gradient(180deg, #0E1A14 0%, #0A130F 100%)",
            }}
        >
            {/* Progress fill — pulse lives INSIDE the fill so it stays clipped to the green area */}
            <motion.div
                initial={{width: 0}}
                animate={{width: `${pct}%`}}
                transition={{duration: 1.4, ease: [0.22, 1, 0.36, 1]}}
                className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
                style={{
                    backgroundColor: "rgba(111, 217, 171, 0.12)",
                    backgroundImage:
                        "repeating-linear-gradient(45deg, transparent 0 6px, rgba(111, 217, 171, 0.18) 6px 7px)",
                }}
            >
                {/* Heartbeat — uses `left` (parent-relative %) instead of `x` (self-relative). Traverses across the fill. */}
                <motion.span
                    initial={{left: "-40%"}}
                    animate={{left: "120%"}}
                    transition={{
                        duration: 2.8,
                        ease: "easeInOut",
                        repeat: Infinity,
                    }}
                    className="absolute inset-y-0 w-2/5 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent 0%, rgba(111, 217, 171, 0.55) 50%, transparent 100%)",
                    }}
                />
            </motion.div>

            {/* Top edge glow */}
            <span
                className="absolute top-0 left-0 right-0 h-px bg-mint pointer-events-none opacity-70"
                style={{boxShadow: "0 0 6px rgba(111, 217, 171, 0.8)"}}
            />

            {/* Content */}
            <div className="relative flex items-center justify-between px-4 py-2.5">
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-mint/80">
                    <Coins size={11} weight="regular" />
                    Yield accruing
                </span>
                <span className="inline-flex items-baseline gap-1.5">
                    {/* The percent. Rendered with 8 decimals so the trailing
                        digits tick visibly per frame. The integer + first 4
                        decimals are stable; the trailing 4 are the live ticker. */}
                    <span className="font-mono tabular text-mint text-[13px] font-medium">
                        +{(tick * 100).toFixed(8)}
                        <span className="text-mint/70">%</span>
                    </span>
                    <ArrowUp size={11} weight="bold" className="text-mint translate-y-px" />
                </span>
            </div>
        </div>
    );
}
