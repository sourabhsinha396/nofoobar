"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The lesson reader is a full-height two-pane workspace (see LessonView): its
// content pane is sized to exactly fill the viewport below the navbar and
// scrolls internally. Anything the public layout renders after it (the
// footer) would push the page past 100vh and produce a second, window-level
// scrollbar. This wrapper drops such trailing chrome on lesson routes only;
// every other public page keeps it. Matches both subdomain paths
// (/courses/...) and path-based tenancy (/org/<slug>/courses/...).
const LESSON_PATH = /\/courses\/[^/]+\/sections\/[^/]+\/lessons\/[^/]+/;

export function HideOnLessonPages({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (LESSON_PATH.test(pathname)) {
    return null;
  }
  return <>{children}</>;
}
