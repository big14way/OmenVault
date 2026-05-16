"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect, useState} from "react";
import {List, X} from "@phosphor-icons/react/dist/ssr";
import {AnimatePresence, motion} from "framer-motion";
import {useAccount, useConnect, useDisconnect} from "wagmi";
import {toast} from "sonner";
import {Button} from "@/components/primitives/button";
import {Wordmark} from "@/components/primitives/wordmark";
import {LiveDot} from "@/components/primitives/badge";
import {useUsdt0Balance, useFaucet} from "@/lib/web3/hooks/use-usdt0";
import {formatUsdt0} from "@/lib/format";
import {cn} from "@/lib/cn";

function shortAddress(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function BalancePill() {
    const {isConnected} = useAccount();
    const {data: balance} = useUsdt0Balance();
    const faucet = useFaucet();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !isConnected) return null;

    const onMint = () => {
        toast.loading("Minting 1,000 USDT0…", {id: "faucet"});
        faucet.mutate(undefined, {
            onSuccess: (r) => {
                const url = `https://explorer.sepolia.mantle.xyz/tx/${r.hash}`;
                toast.success("Minted 1,000 USDT0", {
                    id: "faucet",
                    description: r.slowReceipt ? "Receipt was slow; balance will refresh." : "Balance refreshing.",
                    action: {
                        label: "View tx",
                        onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
                    },
                });
            },
            onError: (err) => toast.error("Faucet failed", {id: "faucet", description: err.message?.slice(0, 80)}),
        });
    };

    return (
        <div className="inline-flex items-stretch border border-border bg-surface-soft font-mono text-[11px] tabular">
            <div className="px-3 flex items-center gap-2 text-bone">
                <span className="text-fg-mute text-[10px] uppercase tracking-eyebrow">USDT0</span>
                <span>{balance ? formatUsdt0(balance.float) : "—"}</span>
            </div>
            <button
                type="button"
                onClick={onMint}
                disabled={faucet.isPending}
                title="Mint 1,000 test USDT0 (testnet faucet)"
                className="px-2.5 border-l border-border text-amber hover:text-night hover:bg-amber transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {faucet.isPending ? "…" : "+"}
            </button>
        </div>
    );
}

function ConnectButton() {
    const {address, isConnected} = useAccount();
    const {connect, connectors, isPending} = useConnect();
    const {disconnect} = useDisconnect();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const handleClick = () => {
        if (isConnected) {
            disconnect();
            return;
        }
        const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
        if (!injected) {
            toast("No wallet detected", {
                description: "Install MetaMask or another injected wallet to connect.",
            });
            return;
        }
        connect(
            {connector: injected},
            {
                onError: (err) =>
                    toast("Couldn't connect wallet", {description: err.message}),
            }
        );
    };

    const label = !mounted
        ? "Connect Wallet"
        : isPending
            ? "Connecting…"
            : isConnected && address
                ? shortAddress(address)
                : "Connect Wallet";

    return (
        <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
            <motion.span
                animate={{opacity: [0.65, 1, 0.65]}}
                transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="inline-flex h-1.5 w-1.5 rounded-full bg-amber transition-colors group-hover:bg-night"
                style={{boxShadow: "0 0 6px rgba(242, 163, 65, 0.7)"}}
            />
            {label}
        </Button>
    );
}

const NAV = [
    {href: "/markets", label: "Markets"},
    {href: "/portfolio", label: "Portfolio"},
    {href: "/agents/registry", label: "Agents"},
    {href: "/swarm", label: "Swarm"},
    {href: "/audit", label: "Audit"},
];

export function TopNav() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={cn(
                "sticky top-0 z-40 transition-all duration-300 ease-editorial",
                scrolled
                    ? "bg-night/85 backdrop-blur-md border-b border-border/80"
                    : "bg-transparent"
            )}
        >
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-8">
                <Link
                    href="/"
                    className="text-bone hover:text-amber transition-colors duration-300"
                >
                    <Wordmark />
                </Link>

                <nav className="hidden md:flex items-center gap-7">
                    {NAV.map((item) => {
                        const active =
                            item.href === "/agents/registry"
                                ? pathname.startsWith("/agents")
                                : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "underline-draw font-mono uppercase tracking-eyebrow text-[11px] transition-colors",
                                    active ? "text-amber" : "text-fg-mute hover:text-bone"
                                )}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="hidden md:flex items-center gap-4">
                    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-eyebrow font-mono text-fg-mute">
                        <LiveDot variant="static" />
                        Mantle Sepolia
                    </span>
                    <BalancePill />
                    <ConnectButton />
                </div>

                <button
                    aria-label="Toggle menu"
                    className="md:hidden p-2 -mr-2 text-bone hover:text-amber transition-colors"
                    onClick={() => setOpen((s) => !s)}
                >
                    {open ? <X size={20} weight="regular" /> : <List size={20} weight="regular" />}
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{opacity: 0, y: -8}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -8}}
                        transition={{duration: 0.2, ease: [0.22, 1, 0.36, 1]}}
                        className="md:hidden border-t border-border bg-night"
                    >
                        <nav className="flex flex-col px-6 py-4">
                            {NAV.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className="py-3 font-mono uppercase tracking-eyebrow text-[12px] text-bone border-b border-border last:border-b-0"
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <div className="mt-4 flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-eyebrow font-mono text-fg-mute">
                                    <LiveDot />
                                    Mantle Sepolia
                                </span>
                                <ConnectButton />
                            </div>
                            <div className="mt-3 flex justify-end">
                                <BalancePill />
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
