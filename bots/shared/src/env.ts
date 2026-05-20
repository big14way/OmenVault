import {config as dotenvConfig} from "dotenv";
import {fileURLToPath} from "node:url";
import {dirname, resolve as pathResolve} from "node:path";

// Load the repo-root .env regardless of which workspace package's CWD we're
// running under. pnpm --filter sets CWD to each bot's directory, where there
// is no .env — without an explicit path, dotenv silently loads nothing and
// requireEnv() throws spuriously. override:true so the project's .env wins
// over stray shell exports (e.g. a leftover PRIVATE_KEY=YOUR_..._HERE in the
// user's ~/.zshrc would otherwise silently shadow the real key in .env).
const here = dirname(fileURLToPath(import.meta.url));
dotenvConfig({path: pathResolve(here, "../../../.env"), override: true});

// Node 18+ terminates the process on unhandledRejection by default. The
// ethers FallbackProvider occasionally lets a "loser" sibling's rejection
// (e.g. one RPC times out while the other returns) escape its handler chain,
// which would crash a long-running bot on any transient network blip. Log
// and keep running — the bot's own per-cycle catches still handle real errors.
let safetyInstalled = false;
if (!safetyInstalled) {
    safetyInstalled = true;
    process.on("unhandledRejection", (reason) => {
        const msg = (reason as Error)?.message ?? String(reason);
        console.error("[shared] swallowed unhandledRejection:", msg);
    });
}

export function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

export function optionalEnv(name: string, fallback = ""): string {
    return process.env[name] ?? fallback;
}
