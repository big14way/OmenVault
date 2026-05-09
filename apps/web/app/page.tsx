import {Hero} from "@/components/landing/hero";
import {LiveTape} from "@/components/landing/live-tape";
import {Pillars} from "@/components/landing/pillars";
import {FeaturedMarkets} from "@/components/landing/featured-markets";
import {HowItWorks} from "@/components/landing/how-it-works";
import {ClosingCTA} from "@/components/landing/closing-cta";

export default function HomePage() {
    return (
        <main className="relative">
            <Hero />
            <LiveTape />
            <Pillars />
            <FeaturedMarkets />
            <HowItWorks />
            <ClosingCTA />
        </main>
    );
}
