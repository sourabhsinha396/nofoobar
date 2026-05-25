import type { CourseLevel } from "@/lib/tenant";

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
