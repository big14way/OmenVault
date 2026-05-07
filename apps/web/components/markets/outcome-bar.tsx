"use client";

import {motion} from "framer-motion";
import {cn} from "@/lib/cn";
import {formatPrice} from "@/lib/format";

interface OutcomeBarProps {
    yesPrice: number; // 0..1
    noPrice: number;
    size?: "sm" | "md" | "lg";
    className?: string;
    showLabels?: boolean;
    animate?: boolean;
}

export function OutcomeBar({
    yesPrice,
    noPrice,
    size = "md",
    className,
    showLabels = true,
    animate = true,
}: OutcomeBarProps) {
    const yesPct = yesPrice * 100;
    const heights = {sm: "h-1.5", md: "h-2", lg: "h-2.5"};
    const labelSize = {
        sm: "text-[11px]",
        md: "text-xs",
        lg: "text-sm",
    };

    return (
        <div className={cn("w-full", className)}>
            <div
                className={cn(
                    "relative w-full overflow-hidden bg-night border border-border",
                    heights[size]
                )}
            >
                <motion.div
                    initial={animate ? {width: "50%"} : {width: `${yesPct}%`}}
                    animate={{width: `${yesPct}%`}}
                    transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                    className="absolute inset-y-0 left-0 bg-mint"
                    style={{boxShadow: "0 0 12px rgba(111, 217, 171, 0.45)"}}
                />
                <motion.div
                    initial={animate ? {width: "50%"} : {width: `${100 - yesPct}%`}}
                    animate={{width: `${100 - yesPct}%`}}
                    transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                    className="absolute inset-y-0 right-0 bg-coral"
                    style={{boxShadow: "0 0 12px rgba(230, 109, 84, 0.45)"}}
                />
                {/* Center divider */}
                <span className="absolute top-0 bottom-0 left-1/2 w-px bg-night/60 pointer-events-none" />
            </div>
            {showLabels && (
                <div
                    className={cn(
                        "mt-2 flex justify-between font-mono tabular",
                        labelSize[size]
                    )}
                >
                    <span className="text-mint inline-flex items-baseline gap-2">
                        <span className="font-mono uppercase tracking-eyebrow text-[10px] text-fg-mute">
                            Yes
                        </span>
                        {formatPrice(yesPrice)}
                    </span>
                    <span className="text-coral inline-flex items-baseline gap-2">
                        {formatPrice(noPrice)}
                        <span className="font-mono uppercase tracking-eyebrow text-[10px] text-fg-mute">
                            No
                        </span>
                    </span>
                </div>
            )}
        </div>
    );
}
