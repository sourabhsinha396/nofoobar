"use client";

import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Platform = {
  name: string;
  terms: string;
  monthlyUsd: number;
  revenueCut: number;
  ours?: boolean;
};

// Published pricing as of June 2026 - re-verify before changing.
const platforms: Platform[] = [
  {
    name: "nofoobar Pro",
    terms: "$49/mo flat · 0% platform fee",
    monthlyUsd: 49,
    revenueCut: 0,
    ours: true,
  },
  {
    name: "Teachable Builder",
    terms: "$89/mo · 0% transaction fee",
    monthlyUsd: 89,
    revenueCut: 0,
  },
  {
    name: "Thinkific Start",
    terms: "$99/mo + 2% surcharge with your own Stripe",
    monthlyUsd: 99,
    revenueCut: 0.02,
  },
  {
    name: "Kajabi Growth",
    terms: "$249/mo",
    monthlyUsd: 249,
    revenueCut: 0,
  },
  {
    name: "Udemy marketplace",
    terms: "generally keeps 63% of each sale",
    monthlyUsd: 0,
    revenueCut: 0.63,
  },
];

function yearlyCost(p: Platform, grossPerYear: number) {
  return p.monthlyUsd * 12 + p.revenueCut * grossPerYear;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function EarningsCalculator() {
  const [price, setPrice] = useState(49);
  const [sales, setSales] = useState(40);

  const gross = price * sales * 12;
  const costs = platforms.map((p) => yearlyCost(p, gross));
  const maxCost = Math.max(...costs);
  const ourCost = costs[0];
  const udemyCost = costs[costs.length - 1];
  const keptVsUdemy = udemyCost - ourCost;

  return (
    <section className="border-b border-border/60 bg-surface-subtle py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Do the math
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Estimate your savings
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Most platforms take a cut of every sale. Here it&apos;s a flat
            $49/mo - sell more, keep more.
          </p>
        </div>

        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
          <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <label htmlFor="calc-price" className="text-muted-foreground">
                  Course price
                </label>
                <span className="font-medium text-foreground">${price}</span>
              </div>
              <input
                id="calc-price"
                type="range"
                min={15}
                max={200}
                step={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full accent-chart-brand"
              />
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <label htmlFor="calc-sales" className="text-muted-foreground">
                  Avg. Sales per month
                </label>
                <span className="font-medium text-foreground">{sales}</span>
              </div>
              <input
                id="calc-sales"
                type="range"
                min={10}
                max={200}
                step={1}
                value={sales}
                onChange={(e) => setSales(Number(e.target.value))}
                className="w-full accent-chart-brand"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">You earn per year</p>
              <p className="mt-1 text-2xl font-medium text-foreground">
                {usd(gross)}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">
                Kept vs selling on Udemy
              </p>
              <p className="mt-1 text-2xl font-medium text-emerald-600 dark:text-emerald-400">
                +{usd(keptVsUdemy)}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-xs text-brand">
              What each platform costs you per year
            </p>
            {platforms.map((p, i) => (
              <div key={p.name}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="text-foreground">
                    {p.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      {p.terms}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      p.ours
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {usd(costs[i])}/yr
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-300",
                      p.ours ? "bg-chart-brand" : "bg-muted-foreground/35"
                    )}
                    style={{
                      width: `${Math.max(2, (costs[i] / maxCost) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
            <p className="text-sm text-muted-foreground">
              The Udemy gap alone pays for Pro{" "}
              <span className="font-medium text-foreground">
                {Math.round(keptVsUdemy / ourCost)}×
              </span>{" "}
              over.
            </p>
            <Link
              href="/signup?plan=pro"
              className="inline-flex items-center rounded-full bg-foreground px-6 py-3 text-base font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Start keeping it
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-muted-foreground">
          Published pricing as of June 2026, monthly billing, comparing the
          tier closest to Pro&apos;s feature set. Udemy generally gives 37%ish
          marketplace revenue share. Card processing applies on
          every platform and isn&apos;t included.
        </p>
      </div>
    </section>
  );
}
