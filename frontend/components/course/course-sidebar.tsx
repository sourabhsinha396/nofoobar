"use client";

import Link from "next/link";

import { CONTENT_TYPE_ICON_CLASSES, CONTENT_TYPE_ICONS } from "@/lib/course-display";
import { cn } from "@/lib/utils";
import type { PublishedCourseLanding } from "@/lib/tenant";

interface Props {
  course: PublishedCourseLanding;
  lessonHrefPrefix: string; // e.g. /courses/intro/sections
  currentSectionSlug: string;
  currentLessonSlug: string;
  onNavigate?: () => void;
}

export function CourseSidebar({
  course,
  lessonHrefPrefix,
  currentSectionSlug,
  currentLessonSlug,
  onNavigate,
}: Props) {
  return (
    <nav className="flex h-full flex-col overflow-y-auto px-3 py-4">
      <div className="mb-3 px-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Curriculum
        </p>
        {/* <p className="mt-1 truncate text-sm font-medium" title={course.title}>
          {course.title}
        </p> */}
      </div>
      <ul className="flex flex-col gap-4">
        {course.sections.map((section) => (
          <li key={section.id}>
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h3>
            {section.lessons.length === 0 ? (
              <p className="mt-1 px-2 text-xs text-muted-foreground">No lessons</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-0.5">
                {section.lessons.map((lesson) => {
                  const Icon = CONTENT_TYPE_ICONS[lesson.content_type];
                  const isActive =
                    section.slug === currentSectionSlug &&
                    lesson.slug === currentLessonSlug;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`${lessonHrefPrefix}/${section.slug}/lessons/${lesson.slug}`}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-start gap-2 rounded-md ml-4 px-2 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            CONTENT_TYPE_ICON_CLASSES[lesson.content_type],
                          )}
                          aria-hidden
                        />
                        <span className="line-clamp-2 flex-1">{lesson.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
