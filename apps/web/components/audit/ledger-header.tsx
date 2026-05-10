"use client";

import {useEffect, useState} from "react";

interface LedgerHeaderProps {
    decisionCount: number;
    /** Block number — ticks up to feel live */
    initialBlock?: number;
}

/**
 * Single-line metadata header. No eyebrow, no stat cards.
 * Reads like the head of a printed log: title + chain readout.
 */
export function LedgerHeader({decisionCount, initialBlock = 3_827_401}: LedgerHeaderProps) {
    const [block, setBlock] = useState(initialBlock);

    // Mantle blocks ~every 2s. Tick the indicator to convey "we're synced."
    useEffect(() => {
        const id = setInterval(() => {
            setBlock((b) => b + 1);
        }, 2000);
        return () => clearInterval(id);
    }, []);

    return (
        <header className="border-b border-border">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-16 pb-10">
                <h1 className="font-display font-extrabold text-display-lg text-bone leading-[1.02]">
                    Ledger
                </h1>

                <p className="mt-5 font-mono text-[12px] text-fg-mute tabular leading-relaxed">
                    mantle-sepolia
                    <span className="mx-2 text-fg-dim">·</span>
                    block{" "}
                    <span className="text-bone tabular">
                        #{block.toLocaleString("en-US")}
                    </span>
                    <span className="mx-2 text-fg-dim">·</span>
                    <span className="text-bone tabular">{decisionCount}</span>{" "}
                    {decisionCount === 1 ? "decision" : "decisions"} recorded
                </p>
            </div>
        </header>
    );
}
