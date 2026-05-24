import Link from "next/link";
import { redirect } from "next/navigation";

import { DeleteLessonButton } from "@/components/delete-lesson-button";
import { LessonContent } from "@/components/lesson-content";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getTenantLesson, serverTenantPath, type LessonContentType } from "@/lib/tenant";

interface Props {
  params: Promise<{
    slug: string;
    courseSlug: string;
    sectionSlug: string;
    lessonSlug: string;
  }>;
}

const CONTENT_TYPE_LABELS: Record<LessonContentType, string> = {
  article: "Article",
  video: "Video",
  lab: "Lab",
  quiz: "Quiz",
};

export default async function LessonDetailPage({ params }: Props) {
  const { slug, courseSlug, sectionSlug, lessonSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [lesson, editHref, sectionHref] = await Promise.all([
    getTenantLesson(slug, courseSlug, sectionSlug, lessonSlug),
    serverTenantPath(
      slug,
      `/admin/courses/${courseSlug}/sections/${sectionSlug}/lessons/${lessonSlug}/edit`,
    ),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/${sectionSlug}`),
  ]);

  if (!lesson) {
    redirect(await serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/${sectionSlug}`));
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <header className="mb-8">
        <Link
          href={sectionHref}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← Section
        </Link>
        <div className="mt-6 flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Lesson
          </p>
          <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {CONTENT_TYPE_LABELS[lesson.content_type]}
          </span>
        </div>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {lesson.title}
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{lesson.slug}</p>
      </header>

      <div className="mb-10">
        <LessonContent lesson={lesson} />
      </div>

      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href={editHref}>Edit lesson</Link>
        </Button>
        <DeleteLessonButton
          orgSlug={slug}
          courseSlug={courseSlug}
          sectionSlug={sectionSlug}
          lessonSlug={lessonSlug}
          lessonTitle={lesson.title}
        />
      </div>
    </main>
  );
}
