import Link from "next/link";
import { ShimmerButton } from "@/components/ui/shimmer-button";

import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AuroraText } from "@/components/ui/aurora-text";
import { Ripple } from "@/components/ui/ripple";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="flex items-center border-b border-border/60">
      <Ripple
              mainCircleSize={340}
              mainCircleOpacity={0.18}
              numCircles={9}
              className="text-background"
            />
      <div className="mx-auto w-full max-w-4xl px-6 py-20 text-center md:py-28">
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em]">
          <AnimatedShinyText className="mx-0 max-w-none text-muted-foreground">
            Courses · Labs · Blogs · AI-assisted
          </AnimatedShinyText>
        </p>

        <h1 className="font-heading text-5xl font-normal leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
          The LMS We{" "}
          <AuroraText colors={["#89cb1f", "#7c3aed", "#9ba633", "#6b9725"]}>
            Wished
          </AuroraText>{" "}
          For.
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          An open-source platform for publishing courses, blogs, and hands-on
          coding labs. Self-host or run our cloud.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <ShimmerButton
              shimmerColor="rgba(20, 20, 20, 1)"
              background="rgb(212, 242, 104)"
              className="text-base font-medium text-gray-900"
            >
              Get started
            </ShimmerButton>
          <Link
            href="https://github.com/sourabhsinha396/nofoobar"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <GithubMark className="h-4 w-4" />
            GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
