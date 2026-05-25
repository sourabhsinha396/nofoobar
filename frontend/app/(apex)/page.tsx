import { Ai } from "@/components/marketing/ai";
import { ContentStructure } from "@/components/marketing/content-structure";
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
      <ProductPillars />
      <Features />
      <Ai />
      <ContentStructure />
      <Reviews />
      <Pricing />
      <Faq />
      <CtaFinal />
      <Footer />
    </>
  );
}
