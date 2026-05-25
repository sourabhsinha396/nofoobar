import Link from "next/link";

import { LEVEL_CLASSES, LEVEL_LABELS, fallbackHue } from "@/lib/course-display";
import type { PublishedCourseSummary } from "@/lib/tenant";

const VISIBLE_TAGS = 3;

export interface CourseCardProps {
  course: PublishedCourseSummary;
  href: string;
}

export function CourseCard({ course, href }: CourseCardProps) {
  const overflow = course.tags.length - VISIBLE_TAGS;
  const hue = fallbackHue(course.slug);

  return (
    <Link href={href} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {course.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL; swap to next/image once R2 upload pipeline lands and we know the host
            <img
              src={course.logo_url}
              alt={`${course.title} cover`}
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-heading text-5xl font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 40%))`,
              }}
              aria-hidden
            >
              {course.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_CLASSES[course.level]}`}
            >
              {LEVEL_LABELS[course.level]}
            </span>
          </div>
          <h3 className="mt-3 font-heading text-xl font-semibold leading-tight">
            {course.title}
          </h3>
          {course.description && (
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
              {course.description}
            </p>
          )}
          {course.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {course.tags.slice(0, VISIBLE_TAGS).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </li>
              ))}
              {overflow > 0 && (
                <li className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground">
                  +{overflow} more
                </li>
              )}
            </ul>
          )}
        </div>
      </article>
    </Link>
  );
}
