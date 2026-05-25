import Link from "next/link";
import { redirect } from "next/navigation";

import { DeleteCourseButton } from "@/components/course/delete-course-button";
import { PublishCourseButton } from "@/components/course/publish-course-button";
import { SortableSectionList } from "@/components/section/sortable-section-list";
import { VisibilityBadge } from "@/components/course/visibility-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTenantCourse, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
}

export default async function CurriculumPage({ params }: Props) {
  const { slug, courseSlug } = await params;

  const [course, newSectionHref, sectionsPrefix, editHref] = await Promise.all([
    getTenantCourse(slug, courseSlug),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/new`),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections`),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/edit`),
  ]);

  if (!course) {
    redirect(await serverTenantPath(slug, "/admin"));
  }

  return (
    <>
      <header className="mb-12">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Course
          </p>
          <VisibilityBadge visibility={course.visibility} />
        </div>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {course.title}
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{course.slug}</p>
        {course.description && (
          <p className="mt-4 max-w-2xl text-muted-foreground">{course.description}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <PublishCourseButton
            orgSlug={slug}
            courseSlug={courseSlug}
            currentVisibility={course.visibility}
          />
          <Button asChild variant="outline" size="sm">
            <Link href={editHref}>Edit course</Link>
          </Button>
          <DeleteCourseButton
            orgSlug={slug}
            courseSlug={courseSlug}
            courseTitle={course.title}
            sectionCount={course.sections.length}
          />
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Curriculum</h2>
          <Button asChild size="lg">
            <Link href={newSectionHref}>Create section</Link>
          </Button>
        </div>
        {course.sections.length === 0 ? (
          <Card className="items-center p-10 text-center">
            <p className="text-muted-foreground">No sections yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a section to start organizing lessons.
            </p>
          </Card>
        ) : (
          <SortableSectionList
            orgSlug={slug}
            courseSlug={courseSlug}
            sectionsPrefix={sectionsPrefix}
            initialSections={course.sections}
          />
        )}
      </section>
    </>
  );
}
