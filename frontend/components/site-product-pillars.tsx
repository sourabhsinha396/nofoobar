import { BookOpen, PenLine, Terminal, Users } from "lucide-react";

type Pillar = {
  Icon: React.ElementType;
  name: string;
  description: string;
};

const pillars: ReadonlyArray<Pillar> = [
  {
    Icon: BookOpen,
    name: "Courses",
    description:
      "Sections, lessons, video URLs from your favorite host. Drafts, drag-to-reorder, free previews.",
  },
  {
    Icon: Terminal,
    name: "Hands-on labs",
    description:
      "Embed live coding sandboxes inside lessons. Each student gets their own container, persisted between sessions.",
  },
  {
    Icon: PenLine,
    name: "Blogs",
    description:
      "Rich-text articles with images and code. Public, SEO-friendly, and the natural top-of-funnel for your courses.",
  },
  {
    Icon: Users,
    name: "Memberships",
    description:
      "Recurring access to a bundle of your content. Subscribers see the courses, blogs, and labs you choose to include.",
  },
];

export function SiteProductPillars() {
  return (
    <section className="border-y border-border/60 bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-14 md:mb-20">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            What you publish
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Four ways to teach.
            <br />
            One platform.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.name}
              className="group flex flex-col rounded-2xl border border-border bg-background p-6 transition-all hover:border-foreground/20 hover:shadow-md hover:shadow-foreground/5"
            >
              <pillar.Icon className="h-8 w-8 text-foreground/80 transition-transform group-hover:scale-105" />
              <h3 className="font-heading mt-5 text-2xl font-normal tracking-tight text-foreground">
                {pillar.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
