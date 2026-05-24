import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getMyEnrollments, serverTenantPath } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MyLearningPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(await serverTenantPath(slug, "/login"));
  }

  const [enrollments, coursesPrefix, browseHref] = await Promise.all([
    getMyEnrollments(slug),
    serverTenantPath(slug, "/courses"),
    serverTenantPath(slug, "/courses"),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          My Learning
        </h1>
        <p className="mt-2 text-muted-foreground">Courses you&apos;re enrolled in.</p>
      </header>

      {!enrollments || enrollments.length === 0 ? (
        <Card className="items-center p-10 text-center">
          <p className="text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
          <Button asChild className="mt-4">
            <Link href={browseHref}>Browse courses</Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => (
            <li key={enrollment.id}>
              <Link href={`${coursesPrefix}/${enrollment.course.slug}`} className="block h-full">
                <Card className="h-full p-6 transition-colors hover:border-foreground/20">
                  <CardHeader className="p-0">
                    <CardTitle className="font-heading text-xl">
                      {enrollment.course.title}
                    </CardTitle>
                    {enrollment.course.description && (
                      <CardDescription className="line-clamp-3">
                        {enrollment.course.description}
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
