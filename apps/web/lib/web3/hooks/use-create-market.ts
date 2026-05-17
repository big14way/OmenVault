"use client";

/**
 * useCreateMarket — permissionless market creation via MarketFactory.createMarket.
 * Returns the new Market address parsed from the MarketCreated event.
 */

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useAccount, useChainId, useSwitchChain, useWalletClient} from "wagmi";
import {decodeEventLog, type Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketFactoryAbi} from "../abis";

const chainLabel = (id: number) => (id === 5003 ? "Mantle Sepolia" : id === 31337 ? "Anvil" : `chain ${id}`);

export interface CreateMarketParams {
    question: string;
    resolutionAt: bigint;
    alloraTopicId: `0x${string}`;
    collateralTier: 0 | 1 | 2;
    minStakeBps?: number;
    liquidityB?: bigint;
}

export function useCreateMarket() {
    const {isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChainAsync} = useSwitchChain();
    const {data: walletClient, refetch: refetchWalletClient} = useWalletClient({
        chainId: deployment.chainId as 5003 | 31337,
    });
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: CreateMarketParams): Promise<Address> => {
            if (!isConnected) throw new Error("Wallet not connected — click Connect Wallet first.");
            if (!deployment.marketFactory) throw new Error("MarketFactory address missing in env");

            let wc = walletClient;
            if (chainId !== deployment.chainId) {
                await switchChainAsync({chainId: deployment.chainId as 5003 | 31337});
                const refreshed = await refetchWalletClient();
                wc = refreshed.data;
            }
            if (!wc) throw new Error(`Switch your wallet to ${chainLabel(deployment.chainId)} and retry.`);

            const factory = deployment.marketFactory;
            const createArgs = [
                {
                    question: params.question,
                    resolutionAt: params.resolutionAt,
                    alloraTopicId: params.alloraTopicId,
                    collateralTier: params.collateralTier,
                    minStakeBps: params.minStakeBps ?? 0,
                    liquidityB: params.liquidityB ?? 0n,
                },
            ] as const;

            // Mantle Sepolia's RPC occasionally returns a JS error string as a fake
            // revert reason during MetaMask's eth_estimateGas ("Cannot destructure
            // property 'gasLimit' of '(intermediate value)' as it is null"). We
            // pre-estimate on the publicClient (fallback RPC pool) and pass `gas`
            // explicitly so the wallet skips its broken estimation step.
            let gas: bigint;
            try {
                const estimated = await publicClient.estimateContractGas({
                    account: wc.account.address,
                    address: factory,
                    abi: marketFactoryAbi,
                    functionName: "createMarket",
                    args: createArgs,
                });
                gas = (estimated * 130n) / 100n;
            } catch {
                gas = 8_000_000n;
            }

            const hash = await wc.writeContract({
                address: factory,
                abi: marketFactoryAbi,
                functionName: "createMarket",
                args: createArgs,
                gas,
            });
            const receipt = await publicClient.waitForTransactionReceipt({
                hash,
                retryCount: 30,
                pollingInterval: 4_000,
            });

            for (const log of receipt.logs) {
                try {
                    const parsed = decodeEventLog({
                        abi: marketFactoryAbi,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (parsed.eventName === "MarketCreated") {
                        return (parsed.args as unknown as {market: Address}).market;
                    }
                } catch {}
            }

            // Log decoding can miss on flaky RPCs (filtered/null logs). Fall back to
            // reading the last market off the factory — see bots/oracle-swarm/scripts/demo.ts.
            const len = (await publicClient.readContract({
                address: factory,
                abi: marketFactoryAbi,
                functionName: "marketsLength",
            })) as bigint;
            if (len > 0n) {
                const last = (await publicClient.readContract({
                    address: factory,
                    abi: marketFactoryAbi,
                    functionName: "allMarkets",
                    args: [len - 1n],
                })) as Address;
                return last;
            }
            throw new Error("MarketCreated event not found in receipt");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["markets", deployment.chainId]});
        },
    });
}
