import type { StatsConfig } from "@/lib/tenant";

export function StatsBlock({ config }: { config: StatsConfig }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
      {config.heading && (
        <h2 className="mb-10 text-center font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {config.heading}
        </h2>
      )}
      <dl
        className={`grid gap-8 text-center sm:grid-cols-2 ${
          config.items.length >= 3 ? "lg:grid-cols-4" : ""
        }`}
      >
        {config.items.map((item, idx) => (
          <div key={idx}>
            <dt className="sr-only">{item.label}</dt>
            <dd className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              {item.value}
            </dd>
            <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
