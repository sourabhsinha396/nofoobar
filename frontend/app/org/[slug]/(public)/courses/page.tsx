import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedCourses, getTenantOrg, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TenantCourseCatalog({ params }: Props) {
  const { slug } = await params;

  const [org, courses, coursesPrefix] = await Promise.all([
    getTenantOrg(slug),
    getPublishedCourses(slug),
    serverTenantPath(slug, "/courses"),
  ]);

  if (!org) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {org.name}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Courses
        </h1>
      </header>

      {!courses || courses.length === 0 ? (
        <Card className="items-center p-10 text-center">
          <p className="text-muted-foreground">No courses available yet.</p>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Link href={`${coursesPrefix}/${course.slug}`} className="block h-full">
                <Card className="h-full p-6 transition-colors hover:border-foreground/20">
                  <CardHeader className="p-0">
                    <CardTitle className="font-heading text-xl">{course.title}</CardTitle>
                    {course.description && (
                      <CardDescription className="line-clamp-3">
                        {course.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
