import { CourseCard } from "@/components/course/course-card";
import type { FeaturedCoursesConfig, PublishedCourseSummary } from "@/lib/tenant";

const AUTO_FALLBACK_LIMIT = 3;

interface Props {
  config: FeaturedCoursesConfig;
  courses: PublishedCourseSummary[];
  coursesPrefix: string;
}

// Empty curation falls back to "latest 3 published" so a new tenant with this
// block enabled still has something to render. Curated IDs that reference
// missing or unpublished courses are silently dropped.
function resolveCourses(
  config: FeaturedCoursesConfig,
  courses: PublishedCourseSummary[],
): PublishedCourseSummary[] {
  if (config.course_ids.length === 0) {
    return courses.slice(0, AUTO_FALLBACK_LIMIT);
  }
  const byId = new Map(courses.map((c) => [c.id, c]));
  return config.course_ids
    .map((id) => byId.get(id))
    .filter((c): c is PublishedCourseSummary => !!c);
}

export function FeaturedCoursesBlock({ config, courses, coursesPrefix }: Props) {
  const resolved = resolveCourses(config, courses);
  if (resolved.length === 0) {
    return null;
  }
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <h2 className="mb-10 text-center font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {config.heading ?? "Featured courses"}
      </h2>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {resolved.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} href={`${coursesPrefix}/${course.slug}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
