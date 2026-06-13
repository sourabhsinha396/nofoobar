import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Pricing } from "@/components/marketing/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Honest prices. No transaction fees beyond Stripe's own. Self-host for free, forever.",
};

export default function PricingPage() {
  return (
    <>
      <Pricing />
      <Footer />
    </>
  );
}
