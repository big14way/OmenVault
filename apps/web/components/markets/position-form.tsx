"use client";

import {useMemo, useState} from "react";
import {motion} from "framer-motion";
import {ArrowRight, Info, Wallet} from "@phosphor-icons/react/dist/ssr";
import {toast} from "sonner";
import {Button} from "@/components/primitives/button";
import {cn} from "@/lib/cn";
import {formatUsdt0, formatPercent, timeUntil} from "@/lib/format";
import {TIER_APY, type Market} from "@/lib/types";

interface PositionFormProps {
    market: Market;
    walletConnected?: boolean;
}

const QUICK = [25, 100, 500, 1500];

export function PositionForm({market, walletConnected = false}: PositionFormProps) {
    const [side, setSide] = useState<"YES" | "NO">("YES");
    const [amount, setAmount] = useState<number>(100);

    const apy = TIER_APY[market.tier];
    const price = side === "YES" ? market.yesPrice : market.noPrice;
    const estShares = useMemo(() => amount / Math.max(price, 0.01), [amount, price]);
    const daysUntilResolve = Math.max(
        1,
        Math.ceil((market.resolutionAt - Date.now()) / 86_400_000)
    );
    const projectedYield = (apy * daysUntilResolve) / 365;

    const handleSubmit = () => {
        if (!walletConnected) {
            toast("Connect wallet first", {
                description:
                    "Mantle Sepolia · MetaMask, Rainbow, or any WalletConnect wallet.",
            });
            return;
        }
        toast("Position queued", {
            description: `Approving ${formatUsdt0(amount)} USDT0 → entering ${side} on Mkt #${market.id}`,
        });
    };

    return (
        <div className="border border-border bg-surface relative overflow-hidden">
            <span className="absolute top-0 left-0 right-0 h-px bg-amber" />

            <div className="px-5 py-4 border-b border-border bg-surface-soft">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-amber">
                    Take a position
                </p>
            </div>

            <div className="p-5 space-y-5">
                {/* Side picker */}
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-2.5">
                        Side
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <SidePick
                            label="YES"
                            price={market.yesPrice}
                            active={side === "YES"}
                            tone="mint"
                            onClick={() => setSide("YES")}
                        />
                        <SidePick
                            label="NO"
                            price={market.noPrice}
                            active={side === "NO"}
                            tone="coral"
                            onClick={() => setSide("NO")}
                        />
                    </div>
                </div>

                {/* Amount */}
                <div>
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                            Amount · USDT0
                        </p>
                        <p className="text-[11px] font-mono text-fg-faint tabular">Balance —</p>
                    </div>
                    <div className="border border-border bg-night focus-within:border-amber transition-colors">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-transparent font-display font-bold text-3xl text-bone px-4 py-3 focus:outline-none tabular"
                            min={0}
                            step={10}
                        />
                    </div>
                    <div className="mt-2 flex gap-1.5">
                        {QUICK.map((q) => (
                            <button
                                key={q}
                                onClick={() => setAmount(q)}
                                className={cn(
                                    "px-2.5 h-7 border font-mono text-[11px] uppercase tracking-eyebrow tabular transition-colors",
                                    amount === q
                                        ? "border-amber bg-amber text-night"
                                        : "border-border text-fg-mute hover:border-bone hover:text-bone"
                                )}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tier */}
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-2.5">
                        Collateral tier
                    </p>
                    <div className="border border-border bg-night px-4 py-3 flex items-center justify-between">
                        <div>
                            <p className="font-display font-bold text-lg text-bone">{market.tier}</p>
                            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-mint">
                                {apy > 0 ? `${(apy * 100).toFixed(0)}% APY` : "No yield"}
                            </p>
                        </div>
                        <Info size={14} weight="regular" className="text-fg-faint" />
                    </div>
                    <p className="mt-1.5 text-[11px] font-mono text-fg-mute leading-relaxed">
                        Set by market creator. Your stake routes here on entry.
                    </p>
                </div>

                {/* Summary */}
                <motion.div
                    layout
                    className="border-t border-border pt-4 space-y-2 font-mono text-[12px] tabular"
                >
                    <Row label="Estimated shares" value={estShares.toFixed(0)} />
                    <Row
                        label="Resolves in"
                        value={timeUntil(market.resolutionAt)}
                        sub={`(${daysUntilResolve}d)`}
                    />
                    {apy > 0 && (
                        <Row
                            label="Projected yield"
                            value={`+${formatPercent(projectedYield, {decimals: 2})}`}
                            tone="mint"
                            sub="if held to resolution"
                        />
                    )}
                </motion.div>

                <Button
                    size="lg"
                    variant={side === "YES" ? "yes" : "no"}
                    className="w-full"
                    onClick={handleSubmit}
                >
                    {walletConnected ? (
                        <>
                            Approve & enter {side}
                            <ArrowRight size={14} weight="regular" />
                        </>
                    ) : (
                        <>
                            <Wallet size={14} weight="regular" />
                            Connect to enter
                        </>
                    )}
                </Button>

                <p className="text-[10px] font-mono uppercase tracking-eyebrow text-fg-faint text-center">
                    TESTNET · TWO TRANSACTIONS: APPROVE + ENTER
                </p>
            </div>
        </div>
    );
}

function SidePick({
    label,
    price,
    active,
    tone,
    onClick,
}: {
    label: "YES" | "NO";
    price: number;
    active: boolean;
    tone: "mint" | "coral";
    onClick: () => void;
}) {
    const accentClass =
        tone === "mint"
            ? active
                ? "border-mint text-mint bg-mint-glow shadow-glow-mint"
                : "border-border text-fg-mute hover:border-mint hover:text-mint"
            : active
              ? "border-coral text-coral bg-coral-glow shadow-glow-coral"
              : "border-border text-fg-mute hover:border-coral hover:text-coral";
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative border p-3 text-left transition-all duration-200",
                accentClass
            )}
        >
            <p className="font-mono text-[10px] uppercase tracking-eyebrow">{label}</p>
            <p className="font-display font-bold text-2xl mt-1 tabular leading-none">
                {price.toFixed(2)}
            </p>
        </button>
    );
}

function Row({
    label,
    value,
    sub,
    tone,
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: "mint" | "coral";
}) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <span className="text-fg-mute uppercase tracking-eyebrow text-[10px]">{label}</span>
            <span className="flex items-baseline gap-1.5">
                <span
                    className={cn(
                        tone === "mint" && "text-mint",
                        tone === "coral" && "text-coral",
                        !tone && "text-bone"
                    )}
                >
                    {value}
                </span>
                {sub && <span className="text-fg-faint text-[10px]">{sub}</span>}
            </span>
        </div>
    );
}
