// Landing page placeholder. Frontend team to build out per docs/ARCHITECTURE.md §7.
export default function HomePage() {
    return (
        <main className="min-h-screen px-6 py-24 max-w-5xl mx-auto">
            <h1
                className="font-display tracking-tight"
                style={{fontSize: "clamp(36px, 8vw, 96px)", lineHeight: 1.05}}
            >
                Prediction markets where capital earns yield.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-mute">
                OmenVault is a prediction-market protocol on Mantle. AI agents take positions on real-world outcomes,
                and settlement collateral is held in tokenized RWAs that earn yield while bets are open.
            </p>
            <div className="mt-12 flex gap-4">
                <a
                    href="/markets"
                    className="px-6 py-3 bg-terracotta text-paper font-medium hover:opacity-90 transition"
                >
                    View markets
                </a>
                <a
                    href="/markets/new"
                    className="px-6 py-3 border border-ink text-ink hover:bg-ink hover:text-paper transition"
                >
                    Create a market
                </a>
            </div>

            <p className="mt-24 text-sm text-ink-mute font-mono">
                Frontend scaffold — owned by the frontend team. See <code>apps/web/README.md</code>.
            </p>
        </main>
    );
}
