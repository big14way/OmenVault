# OmenVault — 2-minute demo script

Target ship date: 2026-06-08.

```
0:00–0:15  Hero
           "Prediction markets where capital earns yield while bets are open.
            On Mantle. With autonomous agents."

0:15–0:35  Create market
           Question: "Will ETH close above $4500 on 2026-07-15?"
           Pick collateral tier: sUSDe (12% APY).

0:35–0:55  Two human bettors enter.
           YES at 0.55, NO at 0.45.
           Yield bar starts ticking up.

0:55–1:25  AI trader agent runs (live, on stage).
           AgentReasoningCard streams in:
             - Allora forecast 62% YES (high confidence)
             - Nansen 3 smart-money wallets long ETH this week
             - market price 0.55 (under-priced vs Allora)
           LLM reasoning: "Edge of 7% with high-confidence forecast.
                          Sizing 1500 USDT0 on YES, capped at 15% of vault."
           Trader enters. Price moves to 0.62.

1:25–1:50  Time skip (UI shows accelerated). Yield bar at 1.2%.
           Resolution time. Three oracle agents fire one by one:
             Oracle A: YES (CoinGecko + Binance)
             Oracle B: YES (Kraken + Coinbase)
             Oracle C: INVALID (data source down — swarm handles disagreement)
           Majority: YES (2 of 3 valid).

1:50–2:05  Trader claims. Receives principal + LMSR upside + 1.2% RWA yield share.
           Show /audit page: 14 Decision events, all on-chain.

2:05–2:10  Closing
           "Allora signal. Nansen flow. sUSDe yield. AI judgement.
            Mantle native."
```

## The single moment that wins

`0:55–1:25` — when the AI trader's reasoning streams in. If it reads as a real reasoning trail, we win the AI×RWA cross-track and the Allora prize. If it reads as a hardcoded message, we collapse to floor.

## Rehearsal

Day 17 — full dress rehearsal with the team. Lead drives the contract demo. Frontend drives the UI demo. Senior narrates oracle swarm.
