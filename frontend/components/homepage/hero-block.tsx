import Link from "next/link";
import { Ripple } from "@/components/ui/ripple";

import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { HeroConfig } from "@/lib/tenant";

export function HeroBlock({ config }: { config: HeroConfig }) {
  const hasBg = !!config.background_image_url;
  return (
    <section className="relative overflow-hidden">
      <Ripple
        mainCircleSize={340}
        mainCircleOpacity={0.18}
        numCircles={9}
        className="text-background"
      />
      <div className="relative mx-auto w-full max-w-4xl px-6 py-24 text-center md:py-32">
        <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-6xl">
          {config.headline}
        </h1>
        {config.subheadline && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {config.subheadline}
          </p>
        )}
        {config.cta_label && config.cta_href && (
          <div className="mt-10 flex justify-center">
            <Link href={config.cta_href}>
              <ShimmerButton className="text-xl font-medium border-lime-500 border-r-4 border-b-4 border-t-0 border-l-0">
                {config.cta_label}
              </ShimmerButton>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
