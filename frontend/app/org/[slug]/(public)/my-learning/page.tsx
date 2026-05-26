import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseCard } from "@/components/course/course-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getMyEnrollments, serverTenantPath, type Enrollment } from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string }>;
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Compact "Enrolled 3 days ago" / "today" / "5 weeks ago" formatter.
// Falls back to the absolute date for anything older than a year because
// "11 months ago" stops being useful past that horizon.
function relativeEnrolledAt(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const deltaMs = then - Date.now();
  const seconds = Math.round(deltaMs / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const months = Math.round(days / 30);

  if (Math.abs(seconds) < 60) return RELATIVE_TIME.format(seconds, "second");
  if (Math.abs(minutes) < 60) return RELATIVE_TIME.format(minutes, "minute");
  if (Math.abs(hours) < 24) return RELATIVE_TIME.format(hours, "hour");
  if (Math.abs(days) < 30) return RELATIVE_TIME.format(days, "day");
  if (Math.abs(months) < 12) return RELATIVE_TIME.format(months, "month");
  return new Date(iso).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sortByMostRecent(enrollments: Enrollment[]): Enrollment[] {
  // Newest first. created_at is an ISO string; lexicographic compare on
  // ISO strings matches chronological order.
  return [...enrollments].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
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

  const sorted = enrollments ? sortByMostRecent(enrollments) : [];
  const count = sorted.length;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <GraduationCap className="size-3.5" aria-hidden />
          Learner
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          My Learning
        </h1>
        {count > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {count} {count === 1 ? "course" : "courses"} · Sorted by most recently
            enrolled
          </p>
        )}
      </header>

      {count === 0 ? (
        <Card className="items-center p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground">
            <BookOpen className="size-6" aria-hidden />
          </div>
          <h2 className="mt-5 font-heading text-xl font-semibold tracking-tight">
            Start your first course
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Browse the catalog and enroll to see your courses here. Free
            previews are open to everyone — no enrollment needed.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href={browseHref}>Browse courses</Link>
          </Button>
        </Card>
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((enrollment) => (
              <li key={enrollment.id} className="flex flex-col gap-2">
                <CourseCard
                  course={enrollment.course}
                  href={`${coursesPrefix}/${enrollment.course.slug}`}
                />
                <p className="px-1 text-xs text-muted-foreground">
                  Enrolled {relativeEnrolledAt(enrollment.created_at)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex justify-center">
            <Button asChild variant="ghost">
              <Link href={browseHref} className="text-sm text-muted-foreground">
                Browse more courses
                <ArrowRight className="ml-1.5 size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
