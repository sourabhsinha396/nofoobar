import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { LessonContent } from "@/components/lesson/lesson-content";
import { LessonView } from "@/components/lesson/lesson-view";
import { Button } from "@/components/ui/button";
import {
  getLearnerLesson,
  getPublishedCourse,
  serverTenantPath,
  type PublishedCourseLanding,
} from "@/lib/tenant";

interface Props {
  params: Promise<{
    slug: string;
    courseSlug: string;
    sectionSlug: string;
    lessonSlug: string;
  }>;
}

interface FlatLesson {
  sectionSlug: string;
  lessonSlug: string;
  title: string;
}

function flattenCurriculum(course: PublishedCourseLanding): FlatLesson[] {
  const flat: FlatLesson[] = [];
  for (const section of course.sections) {
    for (const lesson of section.lessons) {
      flat.push({
        sectionSlug: section.slug,
        lessonSlug: lesson.slug,
        title: lesson.title,
      });
    }
  }
  return flat;
}

function findNeighbors(
  flat: FlatLesson[],
  sectionSlug: string,
  lessonSlug: string,
): { prev: FlatLesson | null; next: FlatLesson | null } {
  const idx = flat.findIndex(
    (l) => l.sectionSlug === sectionSlug && l.lessonSlug === lessonSlug,
  );
  if (idx === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, courseSlug, sectionSlug, lessonSlug } = await params;
  const lesson = await getLearnerLesson(slug, courseSlug, sectionSlug, lessonSlug);
  if (!lesson) {
    return {};
  }
  return { title: lesson.title };
}

export default async function LessonPage({ params }: Props) {
  const { slug, courseSlug, sectionSlug, lessonSlug } = await params;

  const [lesson, course, backToCourseHref, sectionsPrefix] = await Promise.all([
    getLearnerLesson(slug, courseSlug, sectionSlug, lessonSlug),
    getPublishedCourse(slug, courseSlug),
    serverTenantPath(slug, `/courses/${courseSlug}`),
    serverTenantPath(slug, `/courses/${courseSlug}/sections`),
  ]);

  if (!lesson || !course) {
    notFound();
  }

  const flat = flattenCurriculum(course);
  const { prev, next } = findNeighbors(flat, sectionSlug, lessonSlug);

  return (
    <LessonView
      course={course}
      currentSectionSlug={sectionSlug}
      currentLessonSlug={lessonSlug}
      lessonHrefPrefix={sectionsPrefix}
    >
      <div className="mb-8">
        <Link
          href={backToCourseHref}
          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          {course.title}
        </Link>
      </div>

      <header className="mb-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {lesson.title}
        </h1>
      </header>

      <article className="mb-16">
        <LessonContent lesson={lesson} />
      </article>

      <nav className="flex items-center justify-between gap-4 border-t border-border pt-6">
        {prev ? (
          <Button asChild variant="outline">
            <Link
              href={`${sectionsPrefix}/${prev.sectionSlug}/lessons/${prev.lessonSlug}`}
              className="flex h-auto items-center gap-2 py-3"
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Previous
                </span>
                <span className="text-sm font-medium">{prev.title}</span>
              </span>
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild>
            <Link
              href={`${sectionsPrefix}/${next.sectionSlug}/lessons/${next.lessonSlug}`}
              className="flex h-auto items-center gap-2 py-3"
            >
              <span className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-primary-foreground/80">
                  Next
                </span>
                <span className="text-sm font-medium">{next.title}</span>
              </span>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>
    </LessonView>
  );
}
