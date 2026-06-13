import { Card } from "@/components/ui/card";

export default function PromotionsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">Promotions</h2>
      <Card className="items-center p-10 text-center">
        <p className="text-muted-foreground">Promo codes and launch discounts coming soon.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Time-bounded coupons, percentage and fixed-amount discounts, per-cohort campaigns.
        </p>
      </Card>
    </section>
  );
}
