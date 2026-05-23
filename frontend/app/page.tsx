import { SiteAi } from "@/components/site-ai";
import { SiteContentStructure } from "@/components/site-content-structure";
import { SiteCtaFinal } from "@/components/site-cta-final";
import { SiteFaq } from "@/components/site-faq";
import { SiteFeatures } from "@/components/site-features";
import { SiteFooter } from "@/components/site-footer";
import { SiteHero } from "@/components/site-hero";
import { SitePricing } from "@/components/site-pricing";
import { SiteProductPillars } from "@/components/site-product-pillars";
import { SiteReviews } from "@/components/site-reviews";

export default function Home() {
  return (
    <>
      <SiteHero />
      <SiteProductPillars />
      <SiteFeatures />
      <SiteAi />
      <SiteContentStructure />
      <SiteReviews />
      <SitePricing />
      <SiteFaq />
      <SiteCtaFinal />
      <SiteFooter />
    </>
  );
}
