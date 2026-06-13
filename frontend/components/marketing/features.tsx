import {
  Globe,
  MonitorPlay,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Feature = {
  Icon: React.ElementType;
  name: string;
  description: React.ReactNode;
  className: string;
};

const features: ReadonlyArray<Feature> = [
  {
    Icon: Sparkles,
    name: "AI Copilot",
    description:
      "AI copilot for writing lessons, generating quizzes, and generating lab exercises.",
    className: "lg:col-span-2",
  },
  {
    Icon: Globe,
    name: "Custom domains",
    description:
      "Bring your own domain. Automatic TLS. Looks and feels like your site, because it is.",
    className: "lg:col-span-1",
  },
  {
    Icon: MonitorPlay,
    name: "Video & DRM",
    description:
      "Built-in support for Mux, InVideo, Bunny, and YouTube video embeds. DRM supported on the Pro plan.",
    className: "lg:col-span-1",
  },
  {
    Icon: Terminal,
    name: "Coding Labs",
    description: (
      <>
        Built-in support for{" "}
        <a
          href="https://algoholia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
        >
          Algoholia
        </a>{" "}
        coding labs. This helps convert up to 6× better.
      </>
    ),
    className: "lg:col-span-1",
  },
  {
    Icon: Search,
    name: "Built for SEO",
    description:
      "Server-rendered pages, OG metadata, JSON-LD, sitemap. Your blog posts and free lessons rank on day one.",
    className: "lg:col-span-1",
  },
];

export function Features() {
  return (
    <section className="border-b border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16 md:mb-20">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Under the hood
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            The platform handles
            <br />
            what slows you down.
          </h2>
        </div>

        <div className="grid auto-rows-fr grid-cols-1 gap-4 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.name}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-background p-6 transition-all hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5 md:p-8",
                feature.className
              )}
            >
              <feature.Icon className="h-9 w-9 text-foreground/80 transition-transform group-hover:scale-105" />
              <h3 className="font-heading mt-6 text-2xl font-normal tracking-tight text-foreground md:text-3xl">
                {feature.name}
              </h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
