import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";

import { EnrollButton } from "@/components/enrollment/enroll-button";
import { PaymentVerifier } from "@/components/enrollment/payment-verifier";
import { JsonLd } from "@/components/seo/json-ld";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  CONTENT_TYPE_BADGE_CLASSES,
  CONTENT_TYPE_ICON_CLASSES,
  CONTENT_TYPE_ICONS,
  LEVEL_CLASSES,
  LEVEL_LABELS,
  fallbackHue,
} from "@/lib/course-display";
import { formatPrice } from "@/lib/format";
import { tenantOrigin } from "@/lib/site-url";
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

// Learner-facing names. Article lessons surface as plain "Lesson" - course
// material, not blog posts. The admin form still says "Article" since that's
// the content type creators pick.
const CONTENT_TYPE_LABELS = {
  article: "Lesson",
  video: "Video",
  lab: "Lab",
  quiz: "Quiz",
} as const;

const CONTENT_TYPE_PLURALS: Record<LessonContentType, string> = {
  article: "lessons",
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return "<1 min";
  return `${Math.round(seconds / 60)} min`;
}

function LessonRow({ lesson, href }: { lesson: PublishedLessonOutline; href?: string }) {
  const Icon = CONTENT_TYPE_ICONS[lesson.content_type];
  // Type is shown as a quiet tinted pill (owner-approved 2026-07-02). An
  // earlier uppercase "ARTICLE" text label was removed because it made paid
  // courses look like blogs and depressed enrollment intent - keep this pill
  // sentence-case and low-contrast.
  const body = (
    <>
      <Icon
        className={`size-4 ${CONTENT_TYPE_ICON_CLASSES[lesson.content_type]}`}
        aria-hidden
      />
      <span className="flex-1">{lesson.title}</span>
      {lesson.is_free_preview && (
        <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-500 ring-1 ring-emerald-500/30 sm:inline">
          Free preview
        </span>
      )}
      {/* inline-flex, not inline: inline boxes ignore vertical padding and
          inherit the link's text-decoration, which flattens the pill. */}
      <span
        className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ring-1 sm:inline-flex ${CONTENT_TYPE_BADGE_CLASSES[lesson.content_type]}`}
      >
        {CONTENT_TYPE_LABELS[lesson.content_type]}
      </span>
      {lesson.duration_seconds != null && (
        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {formatDuration(lesson.duration_seconds)}
        </span>
      )}
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
    alternates: { canonical: `/courses/${courseSlug}` },
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

  // Lesson-type breakdown - fold across sections so the right-side card can
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
  const firstLessonHref =
    firstSection && firstLesson
      ? `${coursesPrefix}/${course.slug}/sections/${firstSection.slug}/lessons/${firstLesson.slug}`
      : null;
  const startLearningHref = isEnrolled ? firstLessonHref : null;

  const lessonHrefPrefix = `${coursesPrefix}/${course.slug}/sections`;
  const hue = fallbackHue(course.slug);

  const origin = tenantOrigin(org.slug, org.custom_domain);
  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    ...(course.description ? { description: course.description } : {}),
    provider: {
      "@type": "Organization",
      name: org.name,
      url: origin,
    },
    ...(course.logo_url ? { image: course.logo_url } : {}),
    offers: {
      "@type": "Offer",
      price: ((course.price_cents ?? 0) / 100).toFixed(2),
      priceCurrency: course.currency,
      availability: "https://schema.org/InStock",
      url: `${origin}/courses/${course.slug}`,
    },
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <JsonLd data={courseLd} />
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

              {!isPaid ? (
                // Free course: open access, no enrollment. Jump straight into
                // the first lesson - works for signed-out visitors too.
                firstLessonHref ? (
                  <Button asChild size="lg" className="w-full">
                    <Link href={firstLessonHref}>Start learning</Link>
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" disabled>
                    No lessons yet
                  </Button>
                )
              ) : !user ? (
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
                <EnrollButton orgSlug={slug} courseSlug={course.slug} priceLabel={priceLabel} />
              )}

              {/* {totalLessons > 0 && (
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
              )} */}
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
                              !isPaid || isEnrolled || lesson.is_free_preview
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
