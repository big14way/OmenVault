# AGENTS.md

This file documents how autonomous AI agents are used in OmenVault — what they do, how they're identified, what data they consume, and which decisions they make on-chain.

## Identity — ERC-8004

Every agent is registered in `AgentRegistry.sol` as a soulbound ERC-721 NFT. The token ID is the agent's identity for the lifetime of the protocol.

Agent types:

| Type | ID | Role |
|---|---|---|
| Bettor | 0 | Human-controlled; opens positions manually |
| Trader | 1 | LLM-controlled; reads forecasts and flow signals, sizes positions |
| OracleNode | 2 | Resolution agent; signs verdicts on market outcomes |

The registry tracks reputation. Oracle agents that vote with the majority gain reputation; minority votes lose it.

## Trader agent — `bots/trader/`

**Inputs**
1. Current LMSR price for YES and NO from `Market.currentPrice()`.
2. Allora forecast for the market's referenced topic via `AlloraConsumer.getForecast(marketId)`.
3. Nansen smart-money flow on counterparty wallets (via `bots/nansen-watcher` local HTTP cache).

**Decision**
The trader composes a structured prompt and sends it to Anthropic `claude-haiku-4-5`. The LLM returns:

```json
{
  "action": "ENTER" | "PASS" | "EXIT",
  "side": "YES" | "NO",
  "sizeUsdt0": "1500000000",
  "confidence": 0.78,
  "reasoning": "Edge of 7% with high-confidence Allora forecast..."
}
```

If `action == ENTER`, the trader calls `Market.enter(side, sizeUsdt0)` and pins reasoning to IPFS. The IPFS hash is emitted via `DecisionLog.logDecision`.

**This is the headline AI surface.** The LLM synthesizes three external signals into a sized position with a reasoning trail — not a hardcoded heuristic.

## Oracle swarm — `bots/oracle-swarm/`

Three independent processes (architecturally three independent agents). Each oracle:

1. On `market.resolutionAt`, fetches canonical real-world data for the market's question. Each oracle uses different data sources for redundancy:
   - Oracle A: CoinGecko + Binance
   - Oracle B: Kraken + Coinbase
   - Oracle C: Cryptocompare + Pyth historical
2. Independently classifies the outcome as `YES`, `NO`, or `INVALID`.
3. Generates a reasoning blob, pins it to IPFS, signs a `(marketId, vote, ipfsHash)` tuple with its private key.
4. Submits via `OracleSwarm.submitVote(...)`.

After all three votes are in, anyone can call `OracleSwarm.finalize(marketId)`. The contract:
- Computes the majority outcome.
- If 1-1-1 disagreement, finalization reverts and the market stays open for re-vote.
- Increments reputation in `AgentRegistry` for majority-aligned voters; decrements for minority.
- Calls `Market.resolve(outcome)` to unlock claims.

## Nansen watcher — `bots/nansen-watcher/`

Polls Nansen for smart-money labels and netflow on tokens referenced by active markets. Caches results. Exposes a local HTTP endpoint at `http://localhost:7755` that the trader bot reads.

Graceful degrade: if `NANSEN_API_KEY` is unset, returns a neutral signal so the trader's reasoning trail still works in dev.

## Allora consumer — `apps/contracts/src/AlloraConsumer.sol`

On-chain wrapper around Allora's standard consumer interface. Reads forecasts, verifies attestor signatures, surfaces predictions to the trader bot via a view function. Topic IDs are pinned to markets at creation time via `MarketFactory.createMarket`.

## Auditability

Every agent decision flows through `DecisionLog.logDecision(agentId, kind, payloadHash)`. The frontend `/audit` page is a real-time stream of these events. Every reasoning blob is content-addressed via IPFS — judges can click any decision and read the agent's full thought process.
