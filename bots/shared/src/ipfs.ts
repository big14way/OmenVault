import {optionalEnv} from "./env.js";

/// Pin a JSON blob to IPFS via Pinata. Returns the CID.
/// TODO(team): wire to Pinata API when PINATA_JWT is set; mock locally otherwise.
export async function pinJson(_payload: unknown): Promise<string> {
    const jwt = optionalEnv("PINATA_JWT");
    if (!jwt) {
        // Local mock: deterministic CID so tests are stable without external services.
        return "bafkreimocked0000000000000000000000000000000000000000000000000";
    }
    throw new Error("pinJson: TODO(team) implement Pinata pinJSONToIPFS POST");
}
