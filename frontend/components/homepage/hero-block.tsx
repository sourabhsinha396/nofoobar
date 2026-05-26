import Link from "next/link";

import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { HeroConfig } from "@/lib/tenant";

export function HeroBlock({ config }: { config: HeroConfig }) {
  const hasBg = !!config.background_image_url;
  return (
    <section className="relative overflow-hidden">
      {hasBg && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary tenant-supplied URL; swap to next/image once we know the host
        <img
          src={config.background_image_url!}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}
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
            {/* ShimmerButton renders a <button>; wrapping it in a <Link>
                yields an <a><button> nest that's technically invalid HTML
                but works in practice and is the established Magic UI
                pattern in this repo's marketing pages. */}
            <Link href={config.cta_href}>
              <ShimmerButton className="text-base font-medium">
                {config.cta_label}
              </ShimmerButton>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
