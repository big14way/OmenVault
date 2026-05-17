/**
 * Manual three-oracle vote helper for testing the resolve flow on Mantle
 * Sepolia without running the full long-lived oracle bots.
 *
 * Usage:
 *   pnpm -F @omenvault/oracle-swarm vote <marketAddress> [votesCsv] [--no-finalize]
 *
 *   votesCsv defaults to "YES,YES,YES". Pass "YES,YES,NO" for a 2-1 majority,
 *   "YES,NO,INVALID" to trigger TieDisagreement (the contract reverts so the
 *   swarm can re-vote), etc.
 *
 *   By default, after all three votes succeed the script calls
 *   OracleSwarm.finalize(market) so the Market.outcome is updated in one step.
 *   Pass --no-finalize to skip (e.g. when intentionally voting a tie).
 *
 * Requires .env (root):
 *   MANTLE_SEPOLIA_RPC_URL (optional; if unset / unreachable, the script falls
 *                           back to a list of public RPCs via viem's fallback
 *                           transport)
 *   ORACLE_SWARM_ADDRESS
 *   ORACLE_A_PRIVATE_KEY / ORACLE_B_PRIVATE_KEY / ORACLE_C_PRIVATE_KEY
 *   PRIVATE_KEY  (only needed when finalizing — any wallet can call finalize)
 *
 * Each oracle key must already hold ORACLE_ROLE on OracleSwarm AND have a
 * registered ERC-8004 agent token. The deploy + bots/shared smoke script set
 * these up; if you redeploy, re-run smoke to re-grant roles.
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";
import {
    createPublicClient,
    createWalletClient,
    encodeAbiParameters,
    fallback,
    http,
    isAddress,
    keccak256,
    stringToBytes,
    toBytes,
    type Address,
} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {mantleSepoliaTestnet} from "viem/chains";
import {abis} from "@omenvault/shared/abis";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

// Resilient transport: try the user's configured RPC first (often a private
// Tenderly/Alchemy URL with better rate limits), then rotate through public
// fallbacks so a single timeout doesn't kill the run.
const PUBLIC_RPCS = [
    "https://mantle-sepolia.drpc.org",
    "https://rpc.sepolia.mantle.xyz",
    "https://endpoints.omniatech.io/v1/mantle/sepolia/public",
];
const RPC_URLS = Array.from(
    new Set([process.env.MANTLE_SEPOLIA_RPC_URL, process.env.RPC_URL, ...PUBLIC_RPCS].filter(
        (u): u is string => Boolean(u),
    )),
);
const transport = fallback(
    RPC_URLS.map((u) => http(u, {timeout: 15_000, retryCount: 2})),
    {rank: false},
);
const publicClient = createPublicClient({chain: mantleSepoliaTestnet, transport});

type VoteSide = "YES" | "NO" | "INVALID";
const VOTE_CODE: Record<VoteSide, 0 | 1 | 2> = {YES: 0, NO: 1, INVALID: 2};

function parseVotes(csv: string): [VoteSide, VoteSide, VoteSide] {
    const parts = csv.split(",").map((s) => s.trim().toUpperCase());
    if (parts.length !== 3) throw new Error(`votes must be exactly 3 values, got ${parts.length}`);
    for (const p of parts) {
        if (p !== "YES" && p !== "NO" && p !== "INVALID") {
            throw new Error(`invalid vote "${p}" — must be YES / NO / INVALID`);
        }
    }
    return parts as [VoteSide, VoteSide, VoteSide];
}

function fmt(v: VoteSide): string {
    return v === "YES" ? "\x1b[32mYES\x1b[0m" : v === "NO" ? "\x1b[31mNO\x1b[0m" : "\x1b[33mINVALID\x1b[0m";
}

async function submitOne(
    label: "A" | "B" | "C",
    pk: `0x${string}`,
    swarmAddr: Address,
    market: Address,
    vote: VoteSide,
) {
    const account = privateKeyToAccount(pk);
    const code = VOTE_CODE[vote];
    const reasoningHash = keccak256(
        stringToBytes(`vote-script:${market}:${vote}:${Date.now()}`),
    );
    // Must match OracleSwarm.submitVote digest:
    //   keccak256(abi.encode(market, vote, reasoningHash)).toEthSignedMessageHash()
    const inner = keccak256(
        encodeAbiParameters(
            [{type: "address"}, {type: "uint8"}, {type: "bytes32"}],
            [market, code, reasoningHash],
        ),
    );
    // signMessage applies the EIP-191 "\x19Ethereum Signed Message:\n32" prefix.
    const signature = await account.signMessage({message: {raw: toBytes(inner)}});

    const wallet = createWalletClient({account, chain: mantleSepoliaTestnet, transport});
    console.log(`[vote] oracle ${label} (${account.address}) → ${fmt(vote)}`);
    const hash = await wallet.writeContract({
        address: swarmAddr,
        abi: abis.OracleSwarm as any,
        functionName: "submitVote",
        args: [market, code, reasoningHash, signature],
    });
    const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        retryCount: 30,
        pollingInterval: 4_000,
    });
    console.log(`[vote] oracle ${label} tx=${receipt.transactionHash} status=${receipt.status}`);
}

async function tryFinalize(swarmAddr: Address, market: Address) {
    const pk = process.env.PRIVATE_KEY as `0x${string}` | undefined;
    if (!pk) {
        console.log("[vote] PRIVATE_KEY not set — skipping finalize. Call OracleSwarm.finalize manually.");
        return;
    }
    const account = privateKeyToAccount(pk);
    const wallet = createWalletClient({account, chain: mantleSepoliaTestnet, transport});
    console.log(`[vote] finalizing market…`);
    try {
        const hash = await wallet.writeContract({
            address: swarmAddr,
            abi: abis.OracleSwarm as any,
            functionName: "finalize",
            args: [market],
        });
        const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            retryCount: 30,
            pollingInterval: 4_000,
        });
        console.log(`[vote] finalize tx=${receipt.transactionHash} status=${receipt.status}`);
    } catch (err) {
        const msg = (err as Error).message ?? String(err);
        // TieDisagreement / NeedThreeVotes are expected for non-majority vote sets.
        console.warn(`[vote] finalize skipped: ${msg.split("\n")[0]}`);
    }
}

async function main() {
    const args = process.argv.slice(2).filter((a) => a !== "--no-finalize");
    const skipFinalize = process.argv.includes("--no-finalize");
    if (args.length < 1) {
        console.error("Usage: pnpm -F @omenvault/oracle-swarm vote <marketAddress> [YES,YES,YES] [--no-finalize]");
        process.exit(1);
    }
    const market = args[0];
    if (!isAddress(market)) {
        console.error(`Invalid market address: ${market}`);
        process.exit(1);
    }
    const votes = parseVotes(args[1] ?? "YES,YES,YES");

    const swarmAddr = process.env.ORACLE_SWARM_ADDRESS as Address | undefined;
    if (!swarmAddr) throw new Error("ORACLE_SWARM_ADDRESS not set in .env");

    const keys: Record<"A" | "B" | "C", `0x${string}` | undefined> = {
        A: process.env.ORACLE_A_PRIVATE_KEY as `0x${string}` | undefined,
        B: process.env.ORACLE_B_PRIVATE_KEY as `0x${string}` | undefined,
        C: process.env.ORACLE_C_PRIVATE_KEY as `0x${string}` | undefined,
    };
    for (const [k, v] of Object.entries(keys)) {
        if (!v) throw new Error(`ORACLE_${k}_PRIVATE_KEY not set in .env`);
    }

    console.log(`[vote] swarm=${swarmAddr} market=${market}  rpcs=${RPC_URLS.length}`);

    await submitOne("A", keys.A!, swarmAddr, market as Address, votes[0]);
    await submitOne("B", keys.B!, swarmAddr, market as Address, votes[1]);
    await submitOne("C", keys.C!, swarmAddr, market as Address, votes[2]);

    if (skipFinalize) {
        console.log(`[vote] done — 3 votes submitted. (--no-finalize set)`);
        return;
    }
    await tryFinalize(swarmAddr, market as Address);
    console.log(`[vote] done.`);
}

main().catch((err) => {
    console.error("[vote] fatal:", err);
    process.exit(1);
});
