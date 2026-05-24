import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, FileText, FlaskConical, ListChecks, Lock, PlayCircle } from "lucide-react";

import { EnrollButton } from "@/components/enroll-button";
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
  getMyEnrollments,
  getPublishedCourse,
  getTenantOrg,
  serverTenantPath,
  type PublishedLessonOutline,
} from "@/lib/tenant";

interface Props {
  params: Promise<{ slug: string; courseSlug: string }>;
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

function LessonRow({ lesson }: { lesson: PublishedLessonOutline }) {
  const Icon = CONTENT_TYPE_ICONS[lesson.content_type];
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="flex-1">{lesson.title}</span>
      <span className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:inline">
        {CONTENT_TYPE_LABELS[lesson.content_type]}
      </span>
      <Lock className="size-3.5 text-muted-foreground" aria-label="Locked" />
    </div>
  );
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

export default async function CourseLandingPage({ params }: Props) {
  const { slug, courseSlug } = await params;

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

  const [enrollments, loginHref, myLearningHref] = await Promise.all([
    user ? getMyEnrollments(slug) : Promise.resolve(null),
    serverTenantPath(slug, "/login"),
    serverTenantPath(slug, "/my-learning"),
  ]);
  const isEnrolled = !!enrollments?.some((e) => e.course_id === course.id);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {org.name}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-5xl">
          {course.title}
        </h1>
        {course.description && (
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{course.description}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {!user ? (
            <Button asChild size="lg">
              <Link href={loginHref}>Sign in to enroll</Link>
            </Button>
          ) : isEnrolled ? (
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden />
                Enrolled
              </span>
              <Button asChild variant="outline" size="lg">
                <Link href={myLearningHref}>Go to My Learning</Link>
              </Button>
            </div>
          ) : (
            <EnrollButton orgSlug={slug} courseSlug={course.slug} />
          )}
          <p className="text-sm text-muted-foreground">
            {course.sections.length}{" "}
            {course.sections.length === 1 ? "section" : "sections"} ·{" "}
            {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
          </p>
        </div>
      </header>

      <section className="space-y-4">
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
                          <LessonRow lesson={lesson} />
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
