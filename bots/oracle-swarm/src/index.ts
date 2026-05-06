/**
 * Oracle swarm — three independent processes (A/B/C) selected via ORACLE env var.
 *
 * Each oracle, on market.resolutionAt:
 *   1. Fetch canonical real-world data from its own data sources (different per oracle).
 *   2. Independently classify YES / NO / INVALID.
 *   3. Generate reasoning blob, pin to IPFS.
 *   4. Sign (marketId, vote, ipfsHash) tuple.
 *   5. Submit via OracleSwarm.submitVote.
 *
 * Data source assignments:
 *   - Oracle A: CoinGecko + Binance
 *   - Oracle B: Kraken + Coinbase
 *   - Oracle C: Cryptocompare + Pyth historical
 */

import "dotenv/config";

const oracleId = (process.env.ORACLE ?? "A").toUpperCase();

async function main() {
    console.log(`[oracle-${oracleId}] starting`);
    console.log(`[oracle-${oracleId}] TODO(team): poll OracleSwarm for markets needing votes (resolutionAt <= now, not yet voted)`);
    // TODO(team):
    //   - load oracle private key (ORACLE_${oracleId}_PRIVATE_KEY)
    //   - poll OracleSwarm contract for markets with resolutionAt <= now and !hasVoted[market][myAgentId]
    //   - for each, fetch data from this oracle's sources (./datasources/${oracleId.toLowerCase()}.ts)
    //   - classify YES/NO/INVALID
    //   - pin reasoning JSON to IPFS
    //   - sign + submitVote
}

main().catch((err) => {
    console.error(`[oracle-${oracleId}] fatal:`, err);
    process.exit(1);
});
