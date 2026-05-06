# OmenVault Byreal Skills

Six skills covering the OmenVault market lifecycle. Published to the Byreal Skills CLI.

| Skill | Purpose | Wraps |
|---|---|---|
| `omen-create-market` | Permissionless market creation | `MarketFactory.createMarket` |
| `omen-enter` | Take a YES/NO position | `Market.enter` |
| `omen-trade-ai` | AI trader evaluates signals and enters | `bots/trader` |
| `omen-vote-oracle` | Cast oracle vote | `OracleSwarm.submitVote` |
| `omen-finalize` | Finalize a market resolution (anyone can call) | `OracleSwarm.finalize` |
| `omen-claim` | Post-resolution payout | `Market.claim` |

Each skill is a YAML manifest with `requires.env` and `requires.bins` declarations; the entry point is a small Node script that wraps the contract call.
