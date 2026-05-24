import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth";
import type { Membership } from "@/lib/orgs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
