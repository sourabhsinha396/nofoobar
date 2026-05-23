"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  cookieStore.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  redirect("/");
}
