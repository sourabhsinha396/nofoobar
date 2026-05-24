import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  description: string | null;
}

export type Role = "owner" | "instructor" | "student";

export interface Membership {
  org: OrgSummary;
  role: Role;
}

export function tenantUrl(slug: string): string {
  const host = process.env.NEXT_PUBLIC_TENANT_HOST;
  if (host) {
    const protocol = process.env.NEXT_PUBLIC_TENANT_PROTOCOL ?? "https";
    return `${protocol}://${slug}.${host}`;
  }
  return `/org/${slug}`;
}

export async function getMyOrgs(): Promise<Membership[]> {
  const cookieStore = await cookies();
  if (!cookieStore.has(SESSION_COOKIE)) {
    return [];
  }
  try {
    const response = await fetch(`${API_URL}/api/v1/me/orgs`, {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as Membership[];
  } catch {
    return [];
  }
}
