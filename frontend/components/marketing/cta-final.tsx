import Link from "next/link";

import { Ripple } from "@/components/ui/ripple";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export function CtaFinal() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background py-28 md:py-36">
      <Ripple
        mainCircleSize={240}
        mainCircleOpacity={0.18}
        numCircles={9}
        className="text-background"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-background/60">
          Ready when you are
        </p>
        <h2 className="font-heading text-5xl font-normal leading-[1.05] tracking-tight text-foreground md:text-6xl">
          Build your school
          <br />
          Today.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg">
          The repo is public, the docs are getting better every week, and the
          local stack runs in about a minute. Nothing left to wait on.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <ShimmerButton
              shimmerColor="#d4f268"
              background="rgba(20, 20, 20, 1)"
              className="text-base font-medium"
            >
              Get started
            </ShimmerButton>
          </Link>
          <Link
            href="https://github.com/sourabhsinha396/nofoobar"
            className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-transparent px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-background/10"
          >
            Star on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
