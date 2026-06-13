import { EarningsCalculator } from "@/components/marketing/earnings-calculator";
import { CreatorAnalytics } from "@/components/marketing/creator-analytics";
import { CtaFinal } from "@/components/marketing/cta-final";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { ProductPillars } from "@/components/marketing/product-pillars";
import { Reviews } from "@/components/marketing/reviews";

export default function Home() {
  return (
    <>
      <Hero />
      <EarningsCalculator />
      <CreatorAnalytics />
      <Pricing />
      <ProductPillars />
      <Features />
      <Reviews />
      <Faq />
      <CtaFinal />
      <Footer />
    </>
  );
}
