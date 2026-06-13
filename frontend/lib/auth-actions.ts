"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { INTERNAL_API_URL as API_URL } from "@/lib/api-internal";
import { SESSION_COOKIE } from "@/lib/auth";
import { platformCookieDomain } from "@/lib/proxy-cookies";

export async function logout() {
  const cookieStore = await cookies();
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
  } catch {
    // best-effort; clear the local cookie regardless so the user is logged out client-side
  }
  // Must mirror the Domain scoping the API proxy applied at login - a
  // deletion without the matching Domain attribute leaves the platform-wide
  // cookie alive and the user silently stays signed in.
  const host = (await headers()).get("host") ?? "";
  const domain = platformCookieDomain(host);
  cookieStore.set(SESSION_COOKIE, "", {
    maxAge: 0,
    path: "/",
    ...(domain ? { domain } : {}),
  });
  redirect("/");
}
