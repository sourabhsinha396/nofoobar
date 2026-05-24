import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface TenantOrg {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  description: string | null;
}

export interface Course {
  id: string;
  org_id: string;
  slug: string;
  title: string;
  description: string | null;
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
