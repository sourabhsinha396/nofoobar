import { CreditCard } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { VisibilityBadge } from "@/components/course/visibility-badge";
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

  const org = await getTenantOrg(slug);
  if (!org) {
    notFound();
  }

  const [courses, newCourseHref, coursesPrefix, paymentsHref] = await Promise.all([
    getTenantCourses(slug),
    serverTenantPath(slug, "/admin/courses/new"),
    serverTenantPath(slug, "/admin/courses"),
    serverTenantPath(slug, "/admin/payments"),
  ]);

  // Org exists but membership-gated endpoints refused. Almost always: the
  // signed-in user isn't a member of this org. Render a clear message instead
  // of silently bouncing to /me (where the symptom looked like a stripped
  // subdomain).
  if (courses === null) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24">
        <Card className="items-center p-10 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            You&apos;re not a member of {org.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {user.email}. Ask an owner of {org.name} to invite this account,
            or switch organizations.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/me">Back to your organizations</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const publishedCount = courses.filter((c) => c.visibility === "published").length;
  const draftCount = courses.length - publishedCount;

  const stats = [
    { label: "Courses", value: courses.length },
    { label: "Published", value: publishedCount },
    { label: "Drafts", value: draftCount },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {org.name}
        </h1>
        {org.description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{org.description}</p>
        )}
      </header>

      <section className="mb-10 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-1 p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="font-heading text-2xl font-semibold tracking-tight">{stat.value}</p>
          </Card>
        ))}
      </section>

      {org.payment_accounts.length === 0 && (
        <Card className="mb-10 flex flex-col gap-3 border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Connect a payment provider
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can publish free courses now, but paid courses need a connected provider
                (Stripe, soon Razorpay).
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={paymentsHref}>Set up payments</Link>
          </Button>
        </Card>
      )}

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
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{course.title}</p>
                      <VisibilityBadge visibility={course.visibility} />
                    </div>
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
