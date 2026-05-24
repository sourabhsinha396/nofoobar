import { cookies, headers } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Server-side companion to `tenantPath` in lib/orgs.ts. The browser's URL
// shape depends on whether we're in subdomain mode (`demo.host/admin`) or
// path mode (`apex/org/demo/admin`); the request `Host` header tells us which.
export async function serverTenantPath(slug: string, path: string): Promise<string> {
  const host = (await headers()).get("host")?.toLowerCase();
  const tenantHost = process.env.NEXT_PUBLIC_TENANT_HOST?.toLowerCase();
  if (host && tenantHost && host !== tenantHost && host.endsWith(`.${tenantHost}`)) {
    return path;
  }
  return path === "/" ? `/org/${slug}` : `/org/${slug}${path}`;
}

export interface TenantOrg {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  description: string | null;
}

export type CourseVisibility = "draft" | "published";

export interface Course {
  id: string;
  org_id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: CourseVisibility;
}

export interface Section {
  id: string;
  org_id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
}

export interface CourseDetail extends Course {
  sections: Section[];
}

export type LessonContentType = "article" | "video" | "lab" | "quiz";

export interface Lesson {
  id: string;
  org_id: string;
  course_id: string;
  section_id: string;
  slug: string;
  title: string;
  content_type: LessonContentType;
  content: Record<string, unknown>;
  position: number;
}

export interface SectionDetail extends Section {
  lessons: Lesson[];
}

async function tenantHeaders(slug: string): Promise<HeadersInit> {
  const cookieStore = await cookies();
  return {
    cookie: cookieStore.toString(),
    "x-tenant-slug": slug,
  };
}

export async function getTenantOrg(slug: string): Promise<TenantOrg | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/tenant`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as TenantOrg;
  } catch {
    return null;
  }
}

export async function getTenantCourses(slug: string): Promise<Course[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/courses`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Course[];
  } catch {
    return null;
  }
}

export async function getTenantCourse(
  orgSlug: string,
  courseSlug: string,
): Promise<CourseDetail | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/courses/${courseSlug}`, {
      headers: await tenantHeaders(orgSlug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as CourseDetail;
  } catch {
    return null;
  }
}

export async function getTenantSection(
  orgSlug: string,
  courseSlug: string,
  sectionSlug: string,
): Promise<SectionDetail | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/courses/${courseSlug}/sections/${sectionSlug}`,
      {
        headers: await tenantHeaders(orgSlug),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as SectionDetail;
  } catch {
    return null;
  }
}

export async function getTenantLesson(
  orgSlug: string,
  courseSlug: string,
  sectionSlug: string,
  lessonSlug: string,
): Promise<Lesson | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/courses/${courseSlug}/sections/${sectionSlug}/lessons/${lessonSlug}`,
      {
        headers: await tenantHeaders(orgSlug),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Lesson;
  } catch {
    return null;
  }
}
