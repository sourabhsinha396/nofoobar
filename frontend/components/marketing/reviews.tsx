import { cn } from "@/lib/utils";

type Review = {
  name: string;
  handle: string;
  body: string;
  initials: string;
  accent: string;
};

const reviews: ReadonlyArray<Review> = [
  {
    name: "Maya Iyer",
    handle: "maya_ships_code",
    body: "Spun this up over the weekend to replace my hand-rolled LMS. The multi-tenant routing alone was worth the move. Webhooks just work, finally.",
    initials: "MI",
    accent: "bg-amber-200/70",
  },
  {
    name: "Lukas Berger",
    handle: "dev_in_berlin",
    body: "Switched two courses over last weekend. The AI blog drafts saved me a Saturday — I had four posts queued by Sunday.",
    initials: "LB",
    accent: "bg-sky-200/70",
  },
  {
    name: "Priya Naik",
    handle: "founder_journey",
    body: "Launched three courses in a month. Custom domain, branded checkout, mobile-friendly student view — felt like ours from day one.",
    initials: "PN",
    accent: "bg-rose-200/70",
  },
  {
    name: "Noah Tate",
    handle: "indie_teach",
    body: "Embedded interactive labs in three lessons today. Students run Python in the browser without leaving the course. Quietly impressive.",
    initials: "NT",
    accent: "bg-violet-200/70",
  },
  {
    name: "Eun-jin Park",
    handle: "open_edu",
    body: "The marketing page caught my eye, but the actual product made me stay. Boring is the right word for serious software.",
    initials: "EP",
    accent: "bg-emerald-200/70",
  },
  {
    name: "Diego Maldonado",
    handle: "stripe_curious",
    body: "Stripe Connect support would make me move tomorrow. As-is, still tempting. The model makes sense for any small school.",
    initials: "DM",
    accent: "bg-orange-200/70",
  },
];

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex h-fit w-full flex-col gap-3 rounded-2xl border border-border bg-background p-5 transition-shadow hover:shadow-md hover:shadow-foreground/5">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-foreground/80",
            review.accent
          )}
        >
          {review.initials}
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-foreground">
            {review.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            @{review.handle}
          </span>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-foreground/90">
        {review.body}
      </p>
    </div>
  );
}

export function Reviews() {
  return (
    <section className="border-b border-border/60 bg-surface-subtle py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16 md:mb-20">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            What people say
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Quietly winning over creators.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <ReviewCard key={review.handle} review={review} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Illustrative quotes — real testimonials replace these as creators ship.
        </p>
      </div>
    </section>
  );
}
