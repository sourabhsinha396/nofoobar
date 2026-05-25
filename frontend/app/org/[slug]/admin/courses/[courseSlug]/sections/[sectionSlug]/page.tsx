import Link from "next/link";
import { redirect } from "next/navigation";

import { DeleteSectionButton } from "@/components/section/delete-section-button";
import { SortableLessonList } from "@/components/lesson/sortable-lesson-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getTenantSection, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string; sectionSlug: string }>;
}

export default async function SectionDetailPage({ params }: Props) {
  const { slug, courseSlug, sectionSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [section, newLessonHref, lessonsPrefix, editHref] = await Promise.all([
    getTenantSection(slug, courseSlug, sectionSlug),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/${sectionSlug}/lessons/new`),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/${sectionSlug}/lessons`),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/${sectionSlug}/edit`),
  ]);

  if (!section) {
    redirect(await serverTenantPath(slug, `/admin/courses/${courseSlug}`));
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Section
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {section.title}
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{section.slug}</p>
        {section.description && (
          <p className="mt-4 max-w-2xl text-muted-foreground">{section.description}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={editHref}>Edit section</Link>
          </Button>
          <DeleteSectionButton
            orgSlug={slug}
            courseSlug={courseSlug}
            sectionSlug={sectionSlug}
            sectionTitle={section.title}
            lessonCount={section.lessons.length}
          />
        </div>
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
          <SortableLessonList
            orgSlug={slug}
            courseSlug={courseSlug}
            sectionSlug={sectionSlug}
            lessonsPrefix={lessonsPrefix}
            initialLessons={section.lessons}
          />
        )}
      </section>
    </main>
  );
}
