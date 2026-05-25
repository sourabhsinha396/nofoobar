import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, FileText, FlaskConical, ListChecks, Lock, PlayCircle } from "lucide-react";

import { EnrollButton } from "@/components/enroll-button";
import { PaymentVerifier } from "@/components/payment-verifier";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { LEVEL_CLASSES, LEVEL_LABELS, fallbackHue } from "@/lib/course-display";
import { formatPrice } from "@/lib/format";
import {
  getMyEnrollments,
  getPublishedCourse,
  getTenantOrg,
  serverTenantPath,
  type LessonContentType,
  type PublishedLessonOutline,
} from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
  searchParams: Promise<{ payment_attempt?: string }>;
}

const CONTENT_TYPE_ICONS = {
  article: FileText,
  video: PlayCircle,
  lab: FlaskConical,
  quiz: ListChecks,
} as const;

const CONTENT_TYPE_LABELS = {
  article: "Article",
  video: "Video",
  lab: "Lab",
  quiz: "Quiz",
} as const;

const CONTENT_TYPE_PLURALS: Record<LessonContentType, string> = {
  article: "articles",
  video: "videos",
  lab: "labs",
  quiz: "quizzes",
};

const CONTENT_TYPE_ORDER: ReadonlyArray<LessonContentType> = [
  "video",
  "article",
  "lab",
  "quiz",
];

function formatBreakdownEntry(type: LessonContentType, count: number): string {
  if (count === 1) return `1 ${CONTENT_TYPE_LABELS[type].toLowerCase()}`;
  return `${count} ${CONTENT_TYPE_PLURALS[type]}`;
}

function LessonRow({ lesson, href }: { lesson: PublishedLessonOutline; href?: string }) {
  const Icon = CONTENT_TYPE_ICONS[lesson.content_type];
  const body = (
    <>
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="flex-1">{lesson.title}</span>
      <span className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:inline">
        {CONTENT_TYPE_LABELS[lesson.content_type]}
      </span>
      {!href && <Lock className="size-3.5 text-muted-foreground" aria-label="Locked" />}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 py-2 text-sm transition-colors hover:text-foreground"
      >
        {body}
      </Link>
    );
  }
  return <div className="flex items-center gap-3 py-2 text-sm">{body}</div>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, courseSlug } = await params;
  const course = await getPublishedCourse(slug, courseSlug);
  if (!course) {
    return {};
  }
  return {
    title: course.title,
    description: course.description ?? undefined,
  };
}

export default async function CourseLandingPage({ params, searchParams }: Props) {
  const { slug, courseSlug } = await params;
  const { payment_attempt: paymentAttemptId } = await searchParams;

  const [org, course, user] = await Promise.all([
    getTenantOrg(slug),
    getPublishedCourse(slug, courseSlug),
    getCurrentUser(),
  ]);

  if (!org || !course) {
    notFound();
  }

  const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const allSectionIds = course.sections.map((s) => s.id);

  // Lesson-type breakdown — fold across sections so the right-side card can
  // surface "X videos · Y articles · …" instead of a bare lesson count.
  const breakdown = course.sections.reduce(
    (acc, section) => {
      for (const lesson of section.lessons) {
        acc[lesson.content_type] = (acc[lesson.content_type] ?? 0) + 1;
      }
      return acc;
    },
    {} as Partial<Record<LessonContentType, number>>,
  );

  const priceLabel =
    course.price_cents && course.price_cents > 0
      ? formatPrice(course.price_cents, course.currency)
      : "Free";
  const isPaid = course.price_cents !== null && course.price_cents > 0;

  const [enrollments, loginHref, coursesPrefix] = await Promise.all([
    user ? getMyEnrollments(slug) : Promise.resolve(null),
    serverTenantPath(slug, "/login"),
    serverTenantPath(slug, "/courses"),
  ]);
  const isEnrolled = !!enrollments?.some((e) => e.course_id === course.id);

  const firstSection = course.sections[0];
  const firstLesson = firstSection?.lessons[0];
  const startLearningHref =
    isEnrolled && firstSection && firstLesson
      ? `${coursesPrefix}/${course.slug}/sections/${firstSection.slug}/lessons/${firstLesson.slug}`
      : null;

  const lessonHrefPrefix = `${coursesPrefix}/${course.slug}/sections`;
  const hue = fallbackHue(course.slug);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      {paymentAttemptId && user && (
        <PaymentVerifier orgSlug={slug} paymentAttemptId={paymentAttemptId} />
      )}

      {/* Top: header + enroll card side-by-side. Curriculum is its own
          section below the grid, full-width. DOM order is header → aside so
          on mobile (single column) the enroll card lands right under the
          title, and the curriculum naturally follows beneath. */}
      <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-[1fr_360px]">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {org.name}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-5xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              {course.description}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_CLASSES[course.level]}`}
            >
              {LEVEL_LABELS[course.level]}
            </span>
            <span className="text-sm text-muted-foreground">
              {course.sections.length}{" "}
              {course.sections.length === 1 ? "section" : "sections"} ·{" "}
              {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
            </span>
          </div>
          {course.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {course.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>

        <aside>
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
              {course.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL; swap to next/image once R2 upload pipeline lands and we know the host
                <img
                  src={course.logo_url}
                  alt={`${course.title} cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center font-heading text-6xl font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 40%))`,
                  }}
                  aria-hidden
                >
                  {course.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-y-5 p-6">
              <p className="font-heading text-3xl font-semibold tracking-tight">
                {priceLabel}
              </p>

              {!user ? (
                <Button asChild size="lg" className="w-full">
                  <Link href={loginHref}>Sign in to enroll</Link>
                </Button>
              ) : isEnrolled ? (
                <div className="space-y-3">
                  {startLearningHref && (
                    <Button asChild size="lg" className="w-full">
                      <Link href={startLearningHref}>Start learning</Link>
                    </Button>
                  )}
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" aria-hidden />
                    Enrolled
                  </span>
                </div>
              ) : (
                <EnrollButton
                  orgSlug={slug}
                  courseSlug={course.slug}
                  priceCents={course.price_cents}
                  currency={course.currency}
                  priceLabel={isPaid ? priceLabel : "Enroll for free"}
                />
              )}

              {totalLessons > 0 && (
                <div className="border-t pt-5">
                  <p className="text-sm font-medium">This course includes</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {CONTENT_TYPE_ORDER.map((type) => {
                      const count = breakdown[type] ?? 0;
                      if (count === 0) return null;
                      const Icon = CONTENT_TYPE_ICONS[type];
                      return (
                        <li key={type} className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" aria-hidden />
                          <span>{formatBreakdownEntry(type, count)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <section className="mt-12 space-y-4 md:mt-16">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Curriculum</h2>
        {course.sections.length === 0 ? (
          <Card className="items-center p-10 text-center">
            <p className="text-muted-foreground">No lessons published yet.</p>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={allSectionIds} className="w-full">
            {course.sections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <span className="font-medium">{section.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {section.lessons.length}{" "}
                      {section.lessons.length === 1 ? "lesson" : "lessons"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {section.description && (
                    <p className="mb-3 text-sm text-muted-foreground">{section.description}</p>
                  )}
                  {section.lessons.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">No lessons yet.</p>
                  ) : (
                    <ul className="divide-y divide-border border-y border-border">
                      {section.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <LessonRow
                            lesson={lesson}
                            href={
                              isEnrolled
                                ? `${lessonHrefPrefix}/${section.slug}/lessons/${lesson.slug}`
                                : undefined
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>
    </main>
  );
}
