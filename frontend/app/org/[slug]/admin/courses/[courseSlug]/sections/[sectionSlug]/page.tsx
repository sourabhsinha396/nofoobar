import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getTenantSection, serverTenantPath, type LessonContentType } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string; sectionSlug: string }>;
}

const CONTENT_TYPE_LABELS: Record<LessonContentType, string> = {
  article: "Article",
  video: "Video",
  lab: "Lab",
  quiz: "Quiz",
};

function lessonPreview(lesson: { content_type: LessonContentType; content: Record<string, unknown> }) {
  switch (lesson.content_type) {
    case "article": {
      const body = typeof lesson.content.body === "string" ? lesson.content.body : "";
      return body.length > 120 ? `${body.slice(0, 120)}…` : body;
    }
    case "video":
      return typeof lesson.content.url === "string" ? lesson.content.url : "";
    case "lab":
      return typeof lesson.content.lab_id === "string" ? `Lab ${lesson.content.lab_id}` : "";
    case "quiz": {
      const questions = Array.isArray(lesson.content.questions) ? lesson.content.questions : [];
      return `${questions.length} question${questions.length === 1 ? "" : "s"}`;
    }
  }
}

export default async function SectionDetailPage({ params }: Props) {
  const { slug, courseSlug, sectionSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [section, newLessonHref, courseHref] = await Promise.all([
    getTenantSection(slug, courseSlug, sectionSlug),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/${sectionSlug}/lessons/new`),
    serverTenantPath(slug, `/admin/courses/${courseSlug}`),
  ]);

  if (!section) {
    redirect(await serverTenantPath(slug, `/admin/courses/${courseSlug}`));
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <Link
          href={courseHref}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← Course
        </Link>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Section
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {section.title}
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{section.slug}</p>
        {section.description && (
          <p className="mt-4 max-w-2xl text-muted-foreground">{section.description}</p>
        )}
      </header>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Lessons</h2>
          <Button asChild size="lg">
            <Link href={newLessonHref}>Create lesson</Link>
          </Button>
        </div>
        {section.lessons.length === 0 ? (
          <Card className="items-center p-10 text-center">
            <p className="text-muted-foreground">No lessons yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an article, video, lab, or quiz to get started.
            </p>
          </Card>
        ) : (
          <ol className="space-y-3">
            {section.lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <Card className="p-5">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lesson.title}</p>
                        <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {CONTENT_TYPE_LABELS[lesson.content_type]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{lesson.slug}</p>
                      {lessonPreview(lesson) && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {lessonPreview(lesson)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
