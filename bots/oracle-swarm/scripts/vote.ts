/**
 * Manual three-oracle vote helper for testing the resolve flow on Mantle
 * Sepolia without running the full long-lived oracle bots.
 *
 * Usage:
 *   pnpm -F @omenvault/oracle-swarm vote <marketAddress> [votesCsv]
 *
 *   votesCsv defaults to "YES,YES,YES". Pass "YES,YES,NO" for a 2-1 majority,
 *   "YES,NO,INVALID" to trigger TieDisagreement (the contract reverts so the
 *   swarm can re-vote), etc.
 *
 * Requires .env (root):
 *   MANTLE_SEPOLIA_RPC_URL
 *   ORACLE_SWARM_ADDRESS
 *   ORACLE_A_PRIVATE_KEY / ORACLE_B_PRIVATE_KEY / ORACLE_C_PRIVATE_KEY
 *
 * Each oracle key must already hold ORACLE_ROLE on OracleSwarm AND have a
 * registered ERC-8004 agent token. The Deploy.s.sol script does both at deploy
 * time; if you redeploy, re-run that script to re-grant roles.
 */

import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";
import {ethers} from "ethers";
import {abis} from "@omenvault/shared/abis";

const __dirname_ = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(__dirname_, "../../../.env"), override: true});

const RPC_URL = process.env.MANTLE_SEPOLIA_RPC_URL ?? process.env.RPC_URL ?? "http://localhost:8545";

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
    pk: string,
    swarmAddr: string,
    market: string,
    vote: VoteSide,
    provider: ethers.JsonRpcProvider,
) {
    const wallet = new ethers.Wallet(pk, provider);
    const swarm = new ethers.Contract(swarmAddr, abis.OracleSwarm as any, wallet);

    const code = VOTE_CODE[vote];
    const reasoningHash = ethers.keccak256(
        ethers.toUtf8Bytes(`vote-script:${market}:${vote}:${Date.now()}`),
    );
    // Match OracleSwarm.submitVote digest: keccak256(abi.encode(market, vote, reasoningHash))
    const inner = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint8", "bytes32"],
            [market, code, reasoningHash],
        ),
    );
    // ethers signMessage applies the "\x19Ethereum Signed Message:\n32" prefix.
    const signature = await wallet.signMessage(ethers.getBytes(inner));

    console.log(`[vote] oracle ${label} (${wallet.address}) → ${fmt(vote)}`);
    try {
        const tx = await swarm.submitVote(market, code, reasoningHash, signature);
        const receipt = await tx.wait();
        console.log(`[vote] oracle ${label} tx=${receipt?.hash} status=${receipt?.status}`);
    } catch (err) {
        console.error(`[vote] oracle ${label} failed:`, (err as Error).message);
        throw err;
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Usage: pnpm -F @omenvault/oracle-swarm vote <marketAddress> [YES,YES,YES]");
        process.exit(1);
    }
    const market = args[0];
    if (!ethers.isAddress(market)) {
        console.error(`Invalid market address: ${market}`);
        process.exit(1);
    }
    const votes = parseVotes(args[1] ?? "YES,YES,YES");

    const swarmAddr = process.env.ORACLE_SWARM_ADDRESS;
    if (!swarmAddr) throw new Error("ORACLE_SWARM_ADDRESS not set in .env");

    const keys = {
        A: process.env.ORACLE_A_PRIVATE_KEY,
        B: process.env.ORACLE_B_PRIVATE_KEY,
        C: process.env.ORACLE_C_PRIVATE_KEY,
    };
    for (const [k, v] of Object.entries(keys)) {
        if (!v) throw new Error(`ORACLE_${k}_PRIVATE_KEY not set in .env`);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log(`[vote] swarm=${swarmAddr} market=${market}`);

    await submitOne("A", keys.A!, swarmAddr, market, votes[0], provider);
    await submitOne("B", keys.B!, swarmAddr, market, votes[1], provider);
    await submitOne("C", keys.C!, swarmAddr, market, votes[2], provider);

    console.log(`[vote] done — 3 votes submitted. Call OracleSwarm.finalize(${market}) from the UI or via cast.`);
}

main().catch((err) => {
    console.error("[vote] fatal:", err);
    process.exit(1);
});
