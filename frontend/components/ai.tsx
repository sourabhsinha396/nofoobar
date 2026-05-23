import { ListChecks, Sparkles } from "lucide-react";

export function Ai() {
  return (
    <section className="border-b border-border/60 bg-surface-subtle py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16 md:mb-20">
          <p className="mb-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Built-in AI
          </p>
          <h2 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Drafted by AI.
            <br />
            Refined by you.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Two assistants that save you the blank-page moment. They write the
            first pass; you make it yours before it ships.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* AI Blog Drafts */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-background p-8 transition-all hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5">
            <Sparkles className="h-9 w-9 text-foreground/80" />
            <h3 className="font-heading mt-6 text-3xl font-normal tracking-tight text-foreground">
              Blog drafts
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Give it a topic and a rough outline. Get back a publish-ready
              Tiptap draft with headings, code blocks, and natural transitions
              — in your voice, not a generic LLM voice.
            </p>

            <div className="mt-8 rounded-xl border border-border/60 bg-muted/40 p-5 text-sm">
              <div className="text-muted-foreground">
                <span className="text-foreground/40">You:</span> &ldquo;Why
                webhooks are better than URL-redirect success.&rdquo;
              </div>
              <div className="mt-3 flex items-center gap-2 text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-medium">Drafting…</span>
              </div>
              <div className="mt-3 space-y-2 text-foreground/70">
                <div className="font-heading text-base">
                  Why webhooks beat redirects.
                </div>
                <p className="text-[13px] leading-relaxed">
                  Redirect-based success flows look fine until the first
                  refund — then they fall apart. Here&apos;s what to do
                  instead…
                </p>
              </div>
            </div>
          </div>

          {/* AI Quiz Generator */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-background p-8 transition-all hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5">
            <ListChecks className="h-9 w-9 text-foreground/80" />
            <h3 className="font-heading mt-6 text-3xl font-normal tracking-tight text-foreground">
              Quiz generator
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Point it at any lesson — text body or a video transcript — and
              it returns a multiple-choice quiz. Edit the questions, set
              correct answers, ship.
            </p>

            <div className="mt-8 rounded-xl border border-border/60 bg-muted/40 p-5 text-sm">
              <div className="text-muted-foreground">
                <span className="text-foreground/40">Source:</span> lesson-04
                &middot; <em>Path parameters in FastAPI</em>
              </div>
              <div className="mt-3 flex items-center gap-2 text-brand">
                <ListChecks className="h-3.5 w-3.5" />
                <span className="font-medium">Generating 5 questions…</span>
              </div>
              <div className="mt-3 space-y-1.5 text-foreground/80">
                <div className="font-medium">
                  Q1. What annotation marks a path parameter typed as int?
                </div>
                <div className="text-[13px] text-muted-foreground">
                  ○ str &middot; ○ Path() &middot; ● int &middot; ○ Query()
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
