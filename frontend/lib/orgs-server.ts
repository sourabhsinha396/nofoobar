import "server-only";

import { cookies } from "next/headers";

import { INTERNAL_API_URL as API_URL } from "@/lib/api-internal";
import { SESSION_COOKIE } from "@/lib/auth";
import type { Membership } from "@/lib/orgs";

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
