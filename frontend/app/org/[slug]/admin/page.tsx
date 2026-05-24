import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCourses, getTenantOrg, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TenantAdminDashboard({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [org, courses, newCourseHref, coursesPrefix] = await Promise.all([
    getTenantOrg(slug),
    getTenantCourses(slug),
    serverTenantPath(slug, "/admin/courses/new"),
    serverTenantPath(slug, "/admin/courses"),
  ]);

  if (!org || courses === null) {
    redirect("/me");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Organization
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {org.name}
        </h1>
        {org.description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{org.description}</p>
        )}
      </header>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Courses</h2>
          <Button asChild size="lg">
            <Link href={newCourseHref}>Create course</Link>
          </Button>
        </div>
        {courses.length === 0 ? (
          <Card className="items-center p-10 text-center">
            <p className="text-muted-foreground">No courses yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first course to get started.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {courses.map((course) => (
              <li key={course.id}>
                <Link href={`${coursesPrefix}/${course.slug}`} className="block">
                  <Card className="p-5 transition-colors hover:border-foreground/20">
                    <p className="font-medium">{course.title}</p>
                    <p className="text-sm text-muted-foreground">{course.slug}</p>
                    {course.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
                    )}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
