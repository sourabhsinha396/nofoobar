import { CodeXml, FileText, ListChecks, PlayCircle } from "lucide-react";

import type { CourseLevel, LessonContentType } from "@/lib/tenant";

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const LEVEL_CLASSES: Record<CourseLevel, string> = {
  beginner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  intermediate: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  advanced: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export const CONTENT_TYPE_ICONS = {
  article: FileText,
  video: PlayCircle,
  lab: CodeXml,
  quiz: ListChecks,
} as const satisfies Record<LessonContentType, typeof FileText>;

// Soft tint per content type so lesson lists scan at a glance without the
// icons competing with the text.
export const CONTENT_TYPE_ICON_CLASSES: Record<LessonContentType, string> = {
  article: "text-sky-600/70 dark:text-sky-400/70",
  video: "text-violet-600/70 dark:text-violet-400/70",
  lab: "text-emerald-600/70 dark:text-emerald-400/70",
  quiz: "text-amber-600/70 dark:text-amber-400/70",
};

// Deterministic hue from a slug so a course's gradient fallback (used when
// logo_url is null) stays stable per course across reloads. Cheap djb2-ish
// hash; collisions are fine, identity is what matters.
export function fallbackHue(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}
