import { cookies, headers } from "next/headers";

import { INTERNAL_API_URL as API_URL } from "@/lib/api-internal";

// Server-side companion to `tenantPath` in lib/orgs.ts. The browser's URL
// shape depends on whether we're on a tenant site (`demo.host/admin` or a
// custom domain - bare paths) or in apex path mode (`apex/org/demo/admin`).
// The proxy marks every request it rewrote into /org/[slug] with the
// x-tenant-site header; the Host check stays as a fallback for subdomains.
export async function serverTenantPath(slug: string, path: string): Promise<string> {
  const requestHeaders = await headers();
  if (requestHeaders.get("x-tenant-site") === slug) {
    return path;
  }
  const host = requestHeaders.get("host")?.toLowerCase();
  const tenantHost = process.env.NEXT_PUBLIC_TENANT_HOST?.toLowerCase();
  if (host && tenantHost && host !== tenantHost && host.endsWith(`.${tenantHost}`)) {
    return path;
  }
  return path === "/" ? `/org/${slug}` : `/org/${slug}${path}`;
}

export type PaymentProvider = "stripe" | "razorpay";

export interface PaymentAccount {
  provider: PaymentProvider;
  key_id: string;
}

export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export type IntegrationProvider = "webhook" | "slack" | "posthog";

/** A configured integration. `config` has secret fields masked by the API. */
export interface OrgIntegration {
  id: string;
  provider: IntegrationProvider;
  enabled: boolean;
  config: Record<string, string>;
  created_at: string;
}

/** A provider the org could enable. `allowed` is false when the org's plan is
 *  below `min_plan`. */
export interface AvailableIntegration {
  provider: IntegrationProvider;
  min_plan: PlanTier;
  allowed: boolean;
  config_schema: Record<string, unknown>;
}

export type SocialPlatform =
  | "twitter"
  | "linkedin"
  | "youtube"
  | "github"
  | "website";

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface PostHogPublicConfig {
  project_api_key: string;
  host: string;
}

export type OrgRole = "owner" | "instructor" | "student";

export interface TenantOrg {
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
  logo_url: string | null;
  description: string | null;
  tagline: string | null;
  footer_text: string | null;
  contact_email: string | null;
  social_links: SocialLink[];
  payment_accounts: PaymentAccount[];
  // Present when the tenant enabled PostHog; the public site loads analytics.
  posthog: PostHogPublicConfig | null;
  // The current viewer's role in this org, or null for anonymous/non-members.
  viewer_role: OrgRole | null;
}

export type CourseVisibility = "draft" | "published";
export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type Currency = "USD" | "EUR" | "GBP" | "INR" | "AUD";

export interface Course {
  id: string;
  org_id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: CourseVisibility;
  price_cents: number | null;
  currency: string;
  logo_url: string | null;
  level: CourseLevel;
  tags: string[];
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

export type LessonVisibility = "draft" | "published";

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
  visibility: LessonVisibility;
  duration_seconds: number | null;
  is_free_preview: boolean;
}

export interface SectionDetail extends Section {
  lessons: Lesson[];
}

export interface PublishedCourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  logo_url: string | null;
  level: CourseLevel;
  tags: string[];
}

export interface PublishedLessonOutline {
  id: string;
  slug: string;
  title: string;
  content_type: LessonContentType;
  position: number;
  visibility: LessonVisibility;
  duration_seconds: number | null;
  is_free_preview: boolean;
}

export interface PublishedSectionOutline {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  lessons: PublishedLessonOutline[];
}

export interface PublishedCourseLanding extends PublishedCourseSummary {
  sections: PublishedSectionOutline[];
}

export interface Enrollment {
  id: string;
  user_id: string;
  org_id: string;
  course_id: string;
  created_at: string;
  expires_at: string | null;
  course: PublishedCourseSummary;
}

export type PageKind = "terms" | "privacy" | "refund" | "contact" | "custom";

export interface OrganizationPageSummary {
  id: string;
  slug: string;
  title: string;
  kind: PageKind;
  is_published: boolean;
  show_in_footer: boolean;
  footer_position: number;
}

export interface OrganizationPage extends OrganizationPageSummary {
  org_id: string;
  body: Record<string, unknown>;
}

export type NavLinkLocation = "header" | "footer";

export interface NavLink {
  id: string;
  location: NavLinkLocation;
  label: string;
  href: string;
  open_in_new_tab: boolean;
  position: number;
  is_enabled: boolean;
}

export type HomepageBlockType =
  | "hero"
  | "stats"
  | "featured_courses"
  | "testimonials"
  | "faqs";

export interface HeroConfig {
  type: "hero";
  headline: string;
  subheadline: string | null;
  cta_label: string | null;
  cta_href: string | null;
  background_image_url: string | null;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface StatsConfig {
  type: "stats";
  heading: string | null;
  items: StatItem[];
}

export interface FeaturedCoursesConfig {
  type: "featured_courses";
  heading: string | null;
  course_ids: string[];
}

export interface TestimonialItem {
  quote: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  course_id: string | null;
}

export interface TestimonialsConfig {
  type: "testimonials";
  heading: string | null;
  items: TestimonialItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqsConfig {
  type: "faqs";
  heading: string | null;
  items: FaqItem[];
}

export type HomepageBlockConfig =
  | HeroConfig
  | StatsConfig
  | FeaturedCoursesConfig
  | TestimonialsConfig
  | FaqsConfig;

export interface HomepageBlock {
  id: string;
  type: HomepageBlockType;
  position: number;
  is_enabled: boolean;
  config: HomepageBlockConfig;
}

async function tenantHeaders(slug: string): Promise<HeadersInit> {
  const cookieStore = await cookies();
  return {
    cookie: cookieStore.toString(),
    "x-tenant-slug": slug,
  };
}

export async function getPaymentAccounts(slug: string): Promise<PaymentAccount[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/orgs/${slug}/payment-accounts`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PaymentAccount[];
  } catch {
    return null;
  }
}

export async function getOrgIntegrations(slug: string): Promise<OrgIntegration[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/admin/integrations`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as OrgIntegration[];
  } catch {
    return null;
  }
}

export async function getAvailableIntegrations(
  slug: string,
): Promise<AvailableIntegration[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/admin/integrations/available`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as AvailableIntegration[];
  } catch {
    return null;
  }
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

export async function getPublishedCourses(
  slug: string,
): Promise<PublishedCourseSummary[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/public/courses`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PublishedCourseSummary[];
  } catch {
    return null;
  }
}

export async function getHomepageBlocks(slug: string): Promise<HomepageBlock[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/public/homepage`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HomepageBlock[];
  } catch {
    return null;
  }
}

export async function getPublishedPages(
  slug: string,
): Promise<OrganizationPageSummary[]> {
  // Footer composition + page-exists checks pull from this. A fetch failure
  // shouldn't take down the surrounding layout, so any error returns [].
  try {
    const response = await fetch(`${API_URL}/api/v1/public/pages`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) return [];
    return (await response.json()) as OrganizationPageSummary[];
  } catch {
    return [];
  }
}

export async function getPublishedPage(
  orgSlug: string,
  pageSlug: string,
): Promise<OrganizationPage | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/public/pages/${pageSlug}`,
      {
        headers: await tenantHeaders(orgSlug),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as OrganizationPage;
  } catch {
    return null;
  }
}

export async function getAdminPages(
  slug: string,
): Promise<OrganizationPageSummary[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/admin/pages`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as OrganizationPageSummary[];
  } catch {
    return null;
  }
}

export async function getAdminPage(
  orgSlug: string,
  pageSlug: string,
): Promise<OrganizationPage | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/admin/pages/${pageSlug}`, {
      headers: await tenantHeaders(orgSlug),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as OrganizationPage;
  } catch {
    return null;
  }
}

export async function getNavLinks(
  slug: string,
  location: NavLinkLocation,
): Promise<NavLink[]> {
  // Public read: a fetch failure here shouldn't take down the whole navbar.
  // Treat any error as "no links" rather than null - the navbar always
  // renders, just without tenant-added items.
  try {
    const response = await fetch(
      `${API_URL}/api/v1/public/nav-links?location=${location}`,
      {
        headers: await tenantHeaders(slug),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as NavLink[];
  } catch {
    return [];
  }
}

export async function getAdminNavLinks(
  slug: string,
  location: NavLinkLocation,
): Promise<NavLink[] | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/admin/nav-links?location=${location}`,
      {
        headers: await tenantHeaders(slug),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as NavLink[];
  } catch {
    return null;
  }
}

// Admin variant - returns ALL blocks (including is_enabled=false) for editing.
// 403 → caller is not an org member; treat the same as "no data" so the page
// can render an appropriate "not a member" message.
export async function getAdminHomepageBlocks(slug: string): Promise<HomepageBlock[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/admin/homepage`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HomepageBlock[];
  } catch {
    return null;
  }
}

export async function getMyEnrollments(slug: string): Promise<Enrollment[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/me/enrollments`, {
      headers: await tenantHeaders(slug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Enrollment[];
  } catch {
    return null;
  }
}

export async function getPublishedCourse(
  orgSlug: string,
  courseSlug: string,
): Promise<PublishedCourseLanding | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/public/courses/${courseSlug}`, {
      headers: await tenantHeaders(orgSlug),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PublishedCourseLanding;
  } catch {
    return null;
  }
}

export async function getLearnerLesson(
  orgSlug: string,
  courseSlug: string,
  sectionSlug: string,
  lessonSlug: string,
): Promise<Lesson | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/learn/courses/${courseSlug}/sections/${sectionSlug}/lessons/${lessonSlug}`,
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
