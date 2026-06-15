import type { Metadata } from "next";

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
import { JsonLd } from "@/components/seo/json-ld";
import { APEX_ORIGIN, apexUrl } from "@/lib/site-url";

// Title only - the root layout already supplies the description and appends
// the "| nofoobar" brand via its template. Keyword-forward so the homepage
// ranks on what people search, with the brand kept in the suffix.
export const metadata: Metadata = {
  title: "Sell Courses | AI Assisted Course Creation",
  alternates: { canonical: "/" },
};

export default function Home() {
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "nofoobar",
    url: APEX_ORIGIN,
    description:
      "Open-source platform for publishing courses, labs, and blogs under your own brand.",
    logo: apexUrl("/images/logo.png"),
    sameAs: ["https://github.com/sourabhsinha396/nofoobar"],
  };

  return (
    <>
      <JsonLd data={organizationLd} />
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
