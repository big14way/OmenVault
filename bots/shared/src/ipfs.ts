import {createHash} from "node:crypto";
import {optionalEnv} from "./env.js";

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

interface PinataResponse {
    IpfsHash: string;
    PinSize?: number;
    Timestamp?: string;
}

/**
 * Pin a JSON blob to IPFS via Pinata. Returns the resulting CID, prefixed
 * `ipfs://`. Falls back to a deterministic mock CID if `PINATA_JWT` is unset
 * so smoke tests / CI keep working without external services.
 *
 * The mock CID is deterministic-by-content so two calls with the same payload
 * return the same string — useful for tests that compare reasoning hashes.
 */
export async function pinJson(payload: unknown, name?: string): Promise<string> {
    const jwt = optionalEnv("PINATA_JWT");
    if (!jwt) return mockCid(payload);
    try {
        const res = await fetch(PINATA_ENDPOINT, {
            method: "POST",
            headers: {
                authorization: `Bearer ${jwt}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                pinataContent: payload,
                pinataMetadata: name ? {name} : undefined,
            }),
            signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            throw new Error(`pinata HTTP ${res.status}: ${detail.slice(0, 200)}`);
        }
        const data = (await res.json()) as PinataResponse;
        if (!data.IpfsHash) throw new Error("pinata: response missing IpfsHash");
        return `ipfs://${data.IpfsHash}`;
    } catch (err) {
        // Surface but never block the caller — bots write to DecisionLog
        // best-effort and we'd rather have a mock CID than skip the row.
        console.warn(`[ipfs] pinJson failed, falling back to mock: ${(err as Error).message}`);
        return mockCid(payload);
    }
}

function mockCid(payload: unknown): string {
    const json = JSON.stringify(payload);
    const hash = createHash("sha256").update(json).digest("hex").slice(0, 46);
    return `ipfs://bafkreimock${hash}`;
}
