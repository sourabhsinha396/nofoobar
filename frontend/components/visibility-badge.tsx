import type { CourseVisibility } from "@/lib/tenant";

interface Props {
  visibility: CourseVisibility;
}

// Renders only when visibility !== "published". Published is the default
// expectation; only the deviant state (Draft) earns a badge.
export function VisibilityBadge({ visibility }: Props) {
  if (visibility === "published") return null;
  return (
    <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
      Draft
    </span>
  );
}
