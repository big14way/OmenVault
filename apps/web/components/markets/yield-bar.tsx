"use client";

import {useEffect, useState} from "react";
import {motion} from "framer-motion";
import {cn} from "@/lib/cn";

interface YieldBarProps {
    accrued: number;
    projected?: number;
    label?: string;
    className?: string;
    live?: boolean;
}

export function YieldBar({
    accrued,
    projected,
    label = "RWA YIELD ACCRUED",
    className,
    live = true,
}: YieldBarProps) {
    const [tick, setTick] = useState(accrued);

    useEffect(() => {
        if (!live) {
            setTick(accrued);
            return;
        }
        const interval = setInterval(() => {
            setTick((t) => t + 0.00002);
        }, 1500);
        return () => clearInterval(interval);
    }, [accrued, live]);

    const proj = projected ?? Math.max(accrued * 8, 0.01);
    const pct = Math.min(100, (tick / proj) * 100);

    return (
        <div className={cn("w-full", className)}>
            <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                    {label}
                </span>
                <span className="font-mono tabular text-sm text-mint">
                    +{(tick * 100).toFixed(3)}%
                </span>
            </div>
            <div className="relative w-full h-1.5 bg-night border border-border-soft overflow-hidden">
                <motion.div
                    initial={{width: 0}}
                    animate={{width: `${pct}%`}}
                    transition={{duration: 1.2, ease: [0.22, 1, 0.36, 1]}}
                    className="absolute inset-y-0 left-0 bg-mint"
                    style={{
                        boxShadow: "0 0 10px rgba(111, 217, 171, 0.4)",
                        backgroundImage:
                            "repeating-linear-gradient(45deg, transparent 0 4px, rgba(12, 13, 17, 0.18) 4px 6px)",
                    }}
                />
                {/* Trailing pulse */}
                <motion.div
                    animate={{x: ["-10%", `${pct}%`]}}
                    transition={{duration: 3, ease: "easeInOut", repeat: Infinity}}
                    className="absolute inset-y-0 w-12 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent, rgba(111,217,171,0.5), transparent)",
                    }}
                />
            </div>
            {projected != null && (
                <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-eyebrow font-mono text-fg-faint">
                    <span>NOW</span>
                    <span className="tabular">
                        AT RESOLUTION · +{(proj * 100).toFixed(2)}%
                    </span>
                </div>
            )}
        </div>
    );
}
