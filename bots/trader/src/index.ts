/**
 * Trader bot — the headline AI surface.
 *
 * Loop, per configured market:
 *   1. Pull current LMSR price for YES and NO from Market.currentPrice().
 *   2. Pull Allora forecast on the market's referenced topic via AlloraConsumer.getForecast(topicId).
 *   3. Pull Nansen smart-money labels on counterparty addresses (local cache from nansen-watcher).
 *   4. Compose structured prompt, call Anthropic claude-haiku-4-5.
 *   5. Parse {action, side, sizeUsdt0, confidence, reasoning}.
 *   6. If ENTER: call Market.enter(side, sizeUsdt0).
 *   7. Pin reasoning to IPFS, emit Decision via DecisionLog.
 *
 * Material AI: the LLM is reading three signals and producing a non-trivial sizing decision
 * with a reasoning trail. Not "LLM picks a number" — synthesis with audit.
 */

import "dotenv/config";

async function main() {
    console.log("[trader] starting OmenVault trader bot");
    console.log("[trader] TODO(team): implement market polling + decision loop per docs/ARCHITECTURE.md §5.1");
    // TODO(team):
    //   - load env (PRIVATE_KEY, MARKET_FACTORY_ADDRESS, ALLORA_*, NANSEN_*, ANTHROPIC_API_KEY)
    //   - new ethers.Wallet, new ethers.Contract for MarketFactory + each Market
    //   - poll loop (interval from env)
    //   - prompt template (see ./prompt.ts placeholder)
    //   - submit Market.enter on ENTER decisions
}

main().catch((err) => {
    console.error("[trader] fatal:", err);
    process.exit(1);
});
