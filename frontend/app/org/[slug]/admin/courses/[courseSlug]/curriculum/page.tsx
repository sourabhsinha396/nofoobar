import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTenantCourse, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
}

export default async function CurriculumPage({ params }: Props) {
  const { slug, courseSlug } = await params;

  const [course, newSectionHref, sectionsPrefix] = await Promise.all([
    getTenantCourse(slug, courseSlug),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections/new`),
    serverTenantPath(slug, `/admin/courses/${courseSlug}/sections`),
  ]);

  if (!course) {
    redirect(await serverTenantPath(slug, "/admin"));
  }

  return (
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
        <ol className="space-y-3">
          {course.sections.map((section, index) => (
            <li key={section.id}>
              <Link href={`${sectionsPrefix}/${section.slug}`} className="block">
                <Card className="p-5 transition-colors hover:border-foreground/20">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{section.title}</p>
                      <p className="text-sm text-muted-foreground">{section.slug}</p>
                      {section.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
