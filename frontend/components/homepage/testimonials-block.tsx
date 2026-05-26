import { BorderBeam } from "@/components/ui/border-beam";
import { Card } from "@/components/ui/card";
import type { TestimonialsConfig } from "@/lib/tenant";

export function TestimonialsBlock({ config }: { config: TestimonialsConfig }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <h2 className="mb-10 text-center font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {config.heading ?? "What students say"}
      </h2>
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {config.items.map((item, idx) => (
          <li key={idx}>
            <Card className="relative h-full gap-4 overflow-hidden p-6">
              {/* Stagger beam delays so cards don't pulse in unison. The
                  beam is purely decorative and `pointer-events-none` so it
                  doesn't interfere with anything inside the card. */}
              <BorderBeam duration={8} delay={idx * 1.5} colorFrom="#b3e40f" colorTo="#0bf5ce" />
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className="mt-auto flex items-center gap-3">
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary tenant-supplied URL
                  <img
                    src={item.photo_url}
                    alt=""
                    aria-hidden
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex size-10 items-center justify-center rounded-full bg-foreground/10 text-sm font-medium text-foreground/70"
                    aria-hidden
                  >
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.role && (
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
