"use client";

import {useEffect, useMemo, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {LedgerHeader} from "@/components/audit/ledger-header";
import {
    LedgerFilters,
    type LedgerFilterState,
    type LedgerKind,
    type LedgerRange,
    type LedgerType,
} from "@/components/audit/ledger-filters";
import {LedgerRow} from "@/components/audit/ledger-row";
import {LedgerDrawer} from "@/components/audit/ledger-drawer";
import {MOCK_DECISIONS, MOCK_MARKETS} from "@/lib/mock-data";
import type {Decision} from "@/lib/types";

const TYPES: LedgerType[] = ["all", "trader", "oracle", "bettor", "system"];
const KINDS: LedgerKind[] = ["all", "enter", "exit", "vote", "finalize", "claim", "create"];
const RANGES: LedgerRange[] = ["1h", "24h", "7d", "all"];

const RANGE_MS: Record<LedgerRange, number | null> = {
    "1h": 3_600_000,
    "24h": 86_400_000,
    "7d": 7 * 86_400_000,
    all: null,
};

const KIND_MAP: Record<Exclude<LedgerKind, "all">, Decision["kind"]> = {
    enter: "ENTER",
    exit: "EXIT",
    vote: "VOTE",
    finalize: "FINALIZE",
    claim: "CLAIM",
    create: "CREATE_MARKET",
};

function matchesType(d: Decision, t: LedgerType) {
    if (t === "all") return true;
    if (t === "trader") return d.agentType === "Trader";
    if (t === "oracle") return d.agentType === "OracleNode";
    if (t === "bettor") return d.agentType === "Bettor";
    if (t === "system") return d.agentType === "System";
    return true;
}

export default function AuditPage() {
    const router = useRouter();
    const params = useSearchParams();

    const initial: LedgerFilterState = useMemo(() => {
        const get = (k: string) => params.get(k) ?? "";
        const inEnum = <T extends string>(v: string, opts: readonly T[], fb: T): T =>
            (opts as readonly string[]).includes(v) ? (v as T) : fb;
        return {
            type: inEnum(get("type"), TYPES, "all"),
            kind: inEnum(get("kind"), KINDS, "all"),
            market: get("market") || "all",
            range: inEnum(get("range"), RANGES, "24h"),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [filters, setFilters] = useState<LedgerFilterState>(initial);
    const [openDecision, setOpenDecision] = useState<Decision | null>(null);

    // Sync filter state to URL params (shareable links)
    useEffect(() => {
        const sp = new URLSearchParams();
        if (filters.type !== "all") sp.set("type", filters.type);
        if (filters.kind !== "all") sp.set("kind", filters.kind);
        if (filters.market !== "all") sp.set("market", filters.market);
        if (filters.range !== "24h") sp.set("range", filters.range);
        const qs = sp.toString();
        router.replace(qs ? `/audit?${qs}` : "/audit", {scroll: false});
    }, [filters, router]);

    const filtered = useMemo(() => {
        const now = Date.now();
        const rangeWindow = RANGE_MS[filters.range];
        return MOCK_DECISIONS.filter((d) => {
            if (!matchesType(d, filters.type)) return false;
            if (filters.kind !== "all" && d.kind !== KIND_MAP[filters.kind]) return false;
            if (filters.market !== "all" && d.marketId !== filters.market) return false;
            if (rangeWindow !== null && now - d.timestamp > rangeWindow) return false;
            return true;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }, [filters]);

    const markets = useMemo(
        () =>
            MOCK_MARKETS.map((m) => ({id: m.id, label: `mkt-${m.id.padStart(3, "0")}`})).sort(
                (a, b) => parseInt(a.id) - parseInt(b.id)
            ),
        []
    );

    return (
        <main className="relative flex-1 flex flex-col pb-24">
            <LedgerHeader decisionCount={MOCK_DECISIONS.length} />

            {/* Filter band — sticky on long scroll */}
            <div className="sticky top-16 z-30">
                <LedgerFilters
                    value={filters}
                    onChange={setFilters}
                    markets={markets}
                />
            </div>

            {/* Result count + ledger — flex-1 absorbs viewport slack so the
                ledger frame extends to the footer instead of leaving a
                dead-air gap. */}
            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-6 flex-1 flex flex-col">
                <div className="flex items-baseline justify-between mb-3 font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute tabular">
                    <span>
                        <span className="text-bone">{filtered.length}</span>{" "}
                        {filtered.length === 1 ? "result" : "results"}
                    </span>
                    {filtered.length !== MOCK_DECISIONS.length && (
                        <button
                            onClick={() =>
                                setFilters({type: "all", kind: "all", market: "all", range: "all"})
                            }
                            className="text-fg-mute hover:text-amber underline-draw"
                        >
                            clear filters
                        </button>
                    )}
                </div>

                {filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="border border-border bg-night flex-1 flex flex-col">
                        {filtered.map((d) => (
                            <LedgerRow
                                key={d.id}
                                decision={d}
                                onOpen={() => setOpenDecision(d)}
                            />
                        ))}
                        {/* Bottom filler — keeps the frame extending to the
                            footer when content is shorter than viewport.
                            Shows a faint repeating ledger-paper texture so the
                            empty area reads as "ruled paper continuing", not
                            "missing content". */}
                        <div
                            className="flex-1 min-h-[80px]"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(0deg, transparent 0 47px, rgba(232, 229, 221, 0.025) 47px 48px)",
                            }}
                            aria-hidden
                        />
                    </div>
                )}
            </div>

            <LedgerDrawer
                decision={openDecision}
                open={openDecision !== null}
                onOpenChange={(o) => !o && setOpenDecision(null)}
            />
        </main>
    );
}

function EmptyState() {
    return (
        <div className="border border-border bg-night-deep px-6 py-16">
            <p className="font-mono text-[13px] text-fg-mute">
                $ omenvault audit
                <br />
                <span className="text-bone-soft">
                    no decisions in range
                </span>
                <span className="term-cursor ml-1" />
            </p>
            <p className="mt-3 font-mono text-[11px] text-fg-faint">
                try widening the time range or clearing filters
            </p>
        </div>
    );
}
