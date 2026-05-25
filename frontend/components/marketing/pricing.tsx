import Link from "next/link";
import { Check } from "lucide-react";

import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  tagline: string;
  priceLabel: string;
  annualNote?: string;
  features: ReadonlyArray<string>;
  cta: { label: string; href: string };
  highlight?: boolean;
};

const plans: ReadonlyArray<Plan> = [
  {
    name: "Self-host",
    tagline: "Run it yourself, forever.",
    priceLabel: "$0",
    annualNote: "Apache 2.0 · the full code",
    features: [
      "Every feature, no limits",
      "Your servers, your scale",
      "Community support",
      "Bring your own AI keys",
    ],
    cta: { label: "Get the code", href: "https://github.com/sourabhsinha396/algoholic" },
  },
  {
    name: "Starter",
    tagline: "We host it. You teach.",
    priceLabel: "$19",
    annualNote: "or $14/mo billed annually",
    features: [
      "Up to 200 students",
      "Your tenant subdomain",
      "50 GB media storage",
      "AI blog drafts · 10 per month",
      "Email support",
    ],
    cta: { label: "Start trial", href: "/signup?plan=starter" },
  },
  {
    name: "Pro",
    tagline: "When teaching is the business.",
    priceLabel: "$49",
    annualNote: "or $44/mo billed annually",
    features: [
      "Up to 5,000 students",
      "Custom domain · auto TLS",
      "500 GB media storage",
      "AI blog drafts · unlimited",
      "AI quiz generator",
      "Priority email support",
    ],
    cta: { label: "Start trial", href: "/signup?plan=pro" },
    highlight: true,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="border-b border-border/60 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-14 md:mb-20">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Honest prices.
            <br />
            Nothing on top.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            No transaction fees beyond Stripe&apos;s own. No usage gotchas.
            Self-host for free, forever.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border bg-background p-7 md:p-8",
                plan.highlight
                  ? "border-foreground/20 shadow-lg shadow-foreground/5"
                  : "border-border"
              )}
            >
              {plan.highlight && (
                <BorderBeam
                  size={140}
                  duration={9}
                  colorFrom="#d4f268"
                  colorTo="#a78bfa"
                />
              )}

              <div className="flex items-baseline justify-between">
                <h3 className="font-heading text-2xl font-normal tracking-tight text-foreground">
                  {plan.name}
                </h3>
                {plan.highlight && (
                  <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-foreground">
                    Recommended
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.tagline}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-heading text-5xl font-normal tracking-tight text-foreground">
                  {plan.priceLabel}
                </span>
                {plan.priceLabel !== "$0" && (
                  <span className="text-sm text-muted-foreground">/mo</span>
                )}
              </div>
              {plan.annualNote && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.annualNote}
                </p>
              )}

              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                    <span className="text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.cta.href}
                className={cn(
                  "mt-8 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90",
                  plan.highlight
                    ? "bg-brand text-brand-foreground"
                    : "border border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Multiple instructors or 5,000+ students?{" "}
          <Link
            href="mailto:hi@algoholic.com"
            className="text-foreground underline underline-offset-4 hover:opacity-80"
          >
            Talk to us
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
