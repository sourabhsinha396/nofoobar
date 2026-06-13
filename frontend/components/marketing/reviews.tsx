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
    handle: "-",
    body: "Spun this up over the weekend to replace my hand-rolled LMS. The multi-tenant routing alone was worth the move. Webhooks just work, finally.",
    initials: "MI",
    accent: "bg-amber-200/70",
  },
  {
    name: "Lukas Berger",
    handle: "dev_in_berlin",
    body: "Switched two courses over last weekend. The AI blog drafts saved me a Saturday. I had four posts queued by Sunday.",
    initials: "LB",
    accent: "bg-sky-200/70",
  },
  {
    name: "Balaji Naik",
    handle: "-",
    body: "I realised there is no advanced resource for Golang, I created my site and got 400$ in 2 months..",
    initials: "PN",
    accent: "bg-rose-200/70",
  },
  {
    name: "Noah Tate",
    handle: "",
    body: "Embedded interactive labs in three lessons today. Students run Python in the browser without leaving the course. Quietly impressive.",
    initials: "NT",
    accent: "bg-violet-200/70",
  },
  {
    name: "Eun-jin Park",
    handle: "awsexpert_2",
    body: "I used to sell on Udemy which gave me less than 40%, now i consistently earn 2k$+ from my YT audience.",
    initials: "EP",
    accent: "bg-emerald-200/70",
  },
  {
    name: "Eduardo Taylor",
    handle: "-",
    body: "I was able to start my coding school in 14 mins! The DNS setup took a bit longer than expected",
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

        <div className="mb-4 flex flex-col gap-6 rounded-2xl border border-foreground/20 bg-background p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-xl">
            <p className="text-lg leading-relaxed text-foreground/90">
              &ldquo;I run fastapitutorial.com on nofoobar. The Algoholia lab integration made 10000s of learners use my site. Since
              then I&apos;ve received 50+ thank you messages and decent sales :D.&rdquo;
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-brand-foreground">
                SS
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-foreground">
                  Sourabh Sinha
                </span>
                <span className="text-xs text-muted-foreground">
                  Founder · runs{" "}
                  <a
                    href="https://fastapitutorial.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
                  >
                    fastapitutorial.com
                  </a>{" "}
                  on nofoobar
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-3 md:flex-col">
            <div className="rounded-xl bg-secondary/50 px-4 py-3">
              <p className="text-xl font-medium text-foreground">50+</p>
              <p className="text-xs text-muted-foreground">
                student thank-you notes
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 px-4 py-3">
              <p className="text-xl font-medium text-foreground">In prod</p>
              <p className="text-xs text-muted-foreground">
                first tenant, live now
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Do give our LMS a try. We are confident on our product and features.
        </p>
      </div>
    </section>
  );
}
