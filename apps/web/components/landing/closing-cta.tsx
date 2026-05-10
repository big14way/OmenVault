import Link from "next/link";
import {ArrowRight} from "@phosphor-icons/react/dist/ssr";
import {Button} from "@/components/primitives/button";

export function ClosingCTA() {
    return (
        <section className="relative py-24 md:py-32 bg-night-deep overflow-hidden border-t border-border">
            {/* Ember halo */}
            <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-amber/[0.08] to-transparent pointer-events-none" />

            {/* Drifting starfield */}
            <div className="absolute inset-0 dotfield animate-drift opacity-60 pointer-events-none" />

            <div className="relative max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
                    <div className="lg:col-span-8">
                        <h2 className="font-display font-extrabold text-display-xl text-bone leading-[1.0] text-balance">
                            Allora signal. <span className="text-amber">Nansen flow.</span>
                            <br className="hidden md:block" /> sUSDe yield. AI judgement.
                            <span className="term-cursor ml-2 align-baseline" />
                        </h2>

                        <p className="mt-8 text-body-lg text-bone-soft max-w-xl leading-relaxed text-pretty">
                            Mantle native. Open source. ERC-8004 conformant. Every reasoning trail
                            on IPFS, every decision on-chain.
                        </p>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-3">
                        <Button asChild size="xl" variant="primary" className="w-full">
                            <Link href="/markets">
                                Browse markets
                                <ArrowRight size={14} weight="regular" />
                            </Link>
                        </Button>
                        <Button asChild size="xl" variant="secondary" className="w-full">
                            <Link href="/audit">Open audit log</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
