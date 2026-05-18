"use client";

/**
 * useSubmitVote — sign + post a single oracle vote to OracleSwarm.submitVote.
 *
 * The contract requires:
 *   1. msg.sender has ORACLE_ROLE on OracleSwarm
 *   2. msg.sender is a registered ERC-8004 agent (tokenIdOf returns non-zero)
 *   3. signature over keccak256(abi.encode(market, vote, reasoningHash)) under
 *      the standard ethSignedMessage hash, signed by msg.sender
 *
 * The page calling this must already have the user connected with the right
 * wallet. The hook only handles digest construction + signing + tx submission.
 */

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {
    useAccount,
    useChainId,
    useSignMessage,
    useSwitchChain,
    useWalletClient,
} from "wagmi";
import type {Address} from "viem";
import {encodeAbiParameters, keccak256, parseAbiParameters, hexToBytes} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {oracleSwarmAbi} from "../abis";

type VoteSide = "YES" | "NO" | "INVALID";
const VOTE_CODE: Record<VoteSide, 0 | 1 | 2> = {YES: 0, NO: 1, INVALID: 2};

const chainLabel = (id: number) => (id === 5003 ? "Mantle Sepolia" : id === 31337 ? "Anvil" : `chain ${id}`);

export interface SubmitVoteParams {
    market: Address;
    vote: VoteSide;
    /// Bytes32 hash of the off-chain reasoning blob. Pass keccak256(toBytes(jsonString))
    /// or any committed digest; the contract only stores it, never reads.
    reasoningHash: `0x${string}`;
}

export function useSubmitVote() {
    const {isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChainAsync} = useSwitchChain();
    const {signMessageAsync} = useSignMessage();
    const {data: walletClient, refetch: refetchWalletClient} = useWalletClient({
        chainId: deployment.chainId as 5003 | 31337,
    });
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: SubmitVoteParams) => {
            if (!isConnected) throw new Error("Connect a wallet first.");
            if (!deployment.oracleSwarm) throw new Error("OracleSwarm address missing in env");

            let wc = walletClient;
            if (chainId !== deployment.chainId) {
                await switchChainAsync({chainId: deployment.chainId as 5003 | 31337});
                const refreshed = await refetchWalletClient();
                wc = refreshed.data;
            }
            if (!wc) throw new Error(`Switch your wallet to ${chainLabel(deployment.chainId)} and retry.`);

            // Build the inner digest exactly the way OracleSwarm.submitVote expects:
            //   keccak256(abi.encode(market, vote, reasoningHash))
            // then toEthSignedMessageHash() is applied implicitly when wagmi/viem
            // signs raw bytes via personal_sign.
            const voteCode = VOTE_CODE[params.vote];
            const inner = keccak256(
                encodeAbiParameters(
                    parseAbiParameters("address market, uint8 vote, bytes32 reasoningHash"),
                    [params.market, voteCode, params.reasoningHash],
                ),
            );
            // signMessage with raw bytes hashes the message with the
            // "\x19Ethereum Signed Message:\n32" prefix server-side, matching
            // OpenZeppelin's MessageHashUtils.toEthSignedMessageHash on chain.
            const signature = await signMessageAsync({
                message: {raw: hexToBytes(inner)},
            });

            // Pre-simulate via our fallback RPCs. This surfaces real revert
            // reasons (NotOracle / AgentNotRegistered / AlreadyVoted / …) and
            // bypasses MetaMask's flaky pre-flight gas estimation: viem can
            // hand the already-prepared request straight to wallet.writeContract.
            const {request} = await publicClient.simulateContract({
                account: wc.account.address,
                address: deployment.oracleSwarm,
                abi: oracleSwarmAbi,
                functionName: "submitVote",
                args: [params.market, voteCode, params.reasoningHash, signature],
            });
            const hash = await wc.writeContract(request);
            try {
                await publicClient.waitForTransactionReceipt({
                    hash,
                    retryCount: 30,
                    pollingInterval: 4_000,
                });
                return {hash, slowReceipt: false};
            } catch {
                return {hash, slowReceipt: true};
            }
        },
        onSuccess: (_r, params) => {
            queryClient.invalidateQueries({
                queryKey: ["resolution", deployment.chainId, deployment.oracleSwarm, params.market],
            });
            queryClient.invalidateQueries({queryKey: ["decisions", deployment.chainId]});
        },
    });
}
