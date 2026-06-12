import { cookies } from "next/headers";

import { INTERNAL_API_URL as API_URL } from "@/lib/api-internal";

export const SESSION_COOKIE = "session";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export async function buildBackendHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  return { cookie: cookieStore.toString() };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  if (!cookieStore.has(SESSION_COOKIE)) {
    return null;
  }
  try {
    const response = await fetch(`${API_URL}/api/v1/me`, {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as CurrentUser;
  } catch {
    return null;
  }
}
