import { Card } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <section className="space-y-6">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">Pricing</h2>
      <Card className="items-center p-10 text-center">
        <p className="text-muted-foreground">Pricing controls coming soon.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time price, free preview, currency, membership inclusion.
        </p>
      </Card>
    </section>
  );
}
