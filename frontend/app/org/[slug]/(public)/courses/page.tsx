import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
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
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="font-heading text-xl">{course.title}</CardTitle>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          course.price_cents && course.price_cents > 0
                            ? "border-foreground/20 bg-foreground/5 text-foreground"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {course.price_cents && course.price_cents > 0
                          ? formatPrice(course.price_cents, course.currency)
                          : "Free"}
                      </span>
                    </div>
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
