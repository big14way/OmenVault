// /markets — list of all markets. Frontend team to wire reads from MarketFactory.allMarkets().
export default function MarketsListPage() {
    return (
        <main className="min-h-screen px-6 py-16 max-w-5xl mx-auto">
            <h1 className="font-display text-5xl">Markets</h1>
            <p className="mt-4 text-ink-mute">List of all live and resolved markets.</p>
            <div className="mt-8 border border-paper-line p-12 text-center text-ink-mute font-mono text-sm">
                MarketCard list goes here. Wire to MarketFactory.allMarkets().
            </div>
        </main>
    );
}
