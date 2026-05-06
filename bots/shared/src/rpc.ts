import {JsonRpcProvider, Wallet} from "ethers";
import {requireEnv, optionalEnv} from "./env.js";

export function provider(): JsonRpcProvider {
    return new JsonRpcProvider(requireEnv("MANTLE_SEPOLIA_RPC_URL"));
}

export function signer(envKey = "PRIVATE_KEY"): Wallet {
    const pk = optionalEnv(envKey);
    if (!pk) throw new Error(`Missing private key env var: ${envKey}`);
    return new Wallet(pk, provider());
}
