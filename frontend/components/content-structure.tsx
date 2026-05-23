import { Tree, type TreeViewElement } from "@/components/ui/file-tree";

const tree: TreeViewElement[] = [
  {
    id: "1",
    name: "your-school/",
    children: [
      {
        id: "2",
        name: "courses/",
        children: [
          {
            id: "3",
            name: "fastapi-fundamentals/",
            children: [
              {
                id: "4",
                name: "01-introduction/",
                children: [
                  { id: "5", name: "lesson-01-why-async.md" },
                  { id: "6", name: "lesson-02-installation.md" },
                ],
              },
              {
                id: "7",
                name: "02-routing/",
                children: [
                  { id: "8", name: "lesson-03-routes.md" },
                  { id: "9", name: "lesson-04-path-params.md" },
                ],
              },
            ],
          },
          {
            id: "10",
            name: "stripe-integration/",
            children: [
              { id: "11", name: "lesson-01-checkout.md" },
              { id: "12", name: "lesson-02-webhooks.md" },
            ],
          },
        ],
      },
      {
        id: "13",
        name: "blogs/",
        children: [
          { id: "14", name: "why-async-matters.md" },
          { id: "15", name: "stripe-webhooks-explained.md" },
        ],
      },
      {
        id: "16",
        name: "labs/",
        children: [{ id: "17", name: "fastapi-crud-from-scratch" }],
      },
    ],
  },
];

const expandedIds = [
  "1",
  "2",
  "3",
  "4",
  "7",
  "10",
  "13",
  "16",
];

export function ContentStructure() {
  return (
    <section className="border-b border-border/60 bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div>
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              For creators
            </p>
            <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
              A mental model
              <br />
              that maps to your work.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Your school is a tree. Courses hold sections, sections hold
              lessons. Blogs and labs sit beside them. No surprises, no exotic
              concepts — what you author is what students see.
            </p>

            <ul className="mt-8 space-y-3 text-base text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-foreground/40">·</span>
                <span>
                  <span className="text-foreground">Drag-reorder</span>{" "}
                  anything. Order is yours.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-foreground/40">·</span>
                <span>
                  <span className="text-foreground">Draft</span> any node
                  without breaking links to others.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-foreground/40">·</span>
                <span>
                  <span className="text-foreground">Mark anything free</span>{" "}
                  to use as a top-of-funnel preview.
                </span>
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="ml-3 text-xs text-muted-foreground">
                  your-school/
                </span>
              </div>
              <div className="h-[400px]">
                <Tree
                  elements={tree}
                  initialExpandedItems={expandedIds}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
