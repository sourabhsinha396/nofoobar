import { Ai } from "@/components/ai";
import { ContentStructure } from "@/components/content-structure";
import { CtaFinal } from "@/components/cta-final";
import { Faq } from "@/components/faq";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Pricing } from "@/components/pricing";
import { ProductPillars } from "@/components/product-pillars";
import { Reviews } from "@/components/reviews";

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
