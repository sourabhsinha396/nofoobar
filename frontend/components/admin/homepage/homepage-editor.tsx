"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { BlockEditSheet } from "@/components/admin/homepage/block-edit-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiPut } from "@/lib/api";
import type {
  HomepageBlock,
  HomepageBlockConfig,
  HomepageBlockType,
  PublishedCourseSummary,
} from "@/lib/tenant";

interface DraftBlock {
  // Stable React key. For server-loaded blocks this is the row id; for newly
  // added (unsaved) blocks it's a `new-…` token that gets replaced by the
  // server-assigned id after a successful PUT.
  clientId: string;
  config: HomepageBlockConfig;
  is_enabled: boolean;
}

interface Props {
  orgSlug: string;
  initialBlocks: HomepageBlock[];
  courses: PublishedCourseSummary[];
}

const BLOCK_LABELS: Record<HomepageBlockType, string> = {
  hero: "Hero",
  stats: "Stats",
  featured_courses: "Featured courses",
  testimonials: "Testimonials",
  faqs: "FAQs",
};

const ALL_TYPES: HomepageBlockType[] = [
  "hero",
  "stats",
  "featured_courses",
  "testimonials",
  "faqs",
];

function defaultConfig(type: HomepageBlockType): HomepageBlockConfig {
  switch (type) {
    case "hero":
      return {
        type: "hero",
        headline: "",
        subheadline: null,
        cta_label: null,
        cta_href: null,
        background_image_url: null,
      };
    case "stats":
      return {
        type: "stats",
        heading: null,
        items: [{ value: "", label: "" }],
      };
    case "featured_courses":
      return {
        type: "featured_courses",
        heading: null,
        course_ids: [],
      };
    case "testimonials":
      return {
        type: "testimonials",
        heading: null,
        items: [
          { quote: "", name: "", role: null, photo_url: null, course_id: null },
        ],
      };
    case "faqs":
      return {
        type: "faqs",
        heading: null,
        items: [{ question: "", answer: "" }],
      };
  }
}

function fromServer(blocks: HomepageBlock[]): DraftBlock[] {
  return blocks.map((b) => ({
    clientId: b.id,
    config: b.config,
    is_enabled: b.is_enabled,
  }));
}

// `crypto.randomUUID` is only available in secure contexts. Custom dev
// subdomains like `demo.testholic.test` are served over plain HTTP and
// don't qualify, so we fall back to a Math.random-based token. The token
// is only used as a React key for unsaved blocks and is discarded as soon
// as the server returns the real id.
function makeClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// One-line description of a block's contents - keeps the list view scannable
// without having to expand each row. Falls back to a placeholder when the
// block is still empty (newly added, not edited yet).
function summarize(config: HomepageBlockConfig): string {
  switch (config.type) {
    case "hero":
      return config.headline || "Untitled hero";
    case "stats":
      return config.items.length === 1
        ? "1 stat"
        : `${config.items.length} stats`;
    case "featured_courses":
      return config.course_ids.length === 0
        ? "Auto: latest 3 courses"
        : config.course_ids.length === 1
          ? "1 course"
          : `${config.course_ids.length} courses`;
    case "testimonials":
      return config.items.length === 1
        ? "1 testimonial"
        : `${config.items.length} testimonials`;
    case "faqs":
      return config.items.length === 1
        ? "1 question"
        : `${config.items.length} questions`;
  }
}

export function HomepageEditor({ orgSlug, initialBlocks, courses }: Props) {
  const router = useRouter();
  const initial = useMemo(() => fromServer(initialBlocks), [initialBlocks]);

  const [drafts, setDrafts] = useState<DraftBlock[]>(initial);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Cheap dirty check: stringify both sides. The list is small (≤24 blocks
  // by server limit) so the perf hit is negligible.
  const isDirty = useMemo(
    () => JSON.stringify(drafts) !== JSON.stringify(initial),
    [drafts, initial],
  );

  function addBlock(type: HomepageBlockType) {
    setDrafts((prev) => [
      ...prev,
      {
        clientId: `new-${makeClientId()}`,
        config: defaultConfig(type),
        is_enabled: true,
      },
    ]);
    // Open the editor immediately so the admin can fill in required fields
    // (e.g. hero headline) without an extra click.
    setEditingIndex(drafts.length);
  }

  function removeBlock(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, delta: -1 | 1) {
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleEnabled(index: number, enabled: boolean) {
    setDrafts((prev) =>
      prev.map((b, i) => (i === index ? { ...b, is_enabled: enabled } : b)),
    );
  }

  function updateConfig(index: number, config: HomepageBlockConfig) {
    setDrafts((prev) =>
      prev.map((b, i) => (i === index ? { ...b, config } : b)),
    );
  }

  async function onSave() {
    setError(null);
    setIsSaving(true);
    try {
      const saved = await apiPut<HomepageBlock[]>(
        "/api/v1/admin/homepage",
        {
          blocks: drafts.map((d) => ({
            config: d.config,
            is_enabled: d.is_enabled,
          })),
        },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      setDrafts(fromServer(saved));
      setSavedAt(Date.now());
      // Refresh server-rendered ancestors (public homepage caches via fetch
      // cache: "no-store" but the surrounding admin shell may have stale data).
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(
          "One of your blocks has invalid or empty required fields. Open it to fix.",
        );
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can edit the homepage.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {drafts.length === 0
            ? "No blocks yet. Your homepage will show the default."
            : `${drafts.length} block${drafts.length === 1 ? "" : "s"}`}
          {savedAt && !isDirty && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              Saved.
            </span>
          )}
        </div>
        <Button onClick={onSave} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      <ul className="space-y-3">
        {drafts.map((block, index) => (
          <li key={block.clientId}>
            <Card className="flex flex-row items-center gap-3 p-4">
              <GripVertical
                className="size-4 shrink-0 text-muted-foreground/50"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  {BLOCK_LABELS[block.config.type]}
                </p>
                <p className="mt-1 truncate text-sm">{summarize(block.config)}</p>
              </div>
              <Switch
                checked={block.is_enabled}
                onCheckedChange={(v) => toggleEnabled(index, v)}
                aria-label={`Enable ${BLOCK_LABELS[block.config.type]} block`}
              />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === drafts.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingIndex(index)}
                  aria-label="Edit block"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBlock(index)}
                  aria-label="Delete block"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 size-4" />
            Add block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {ALL_TYPES.map((type) => (
            <DropdownMenuItem key={type} onClick={() => addBlock(type)}>
              {BLOCK_LABELS[type]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <BlockEditSheet
        open={editingIndex !== null}
        onOpenChange={(open) => {
          if (!open) setEditingIndex(null);
        }}
        block={editingIndex !== null ? drafts[editingIndex] : null}
        courses={courses}
        onConfigChange={(config) => {
          if (editingIndex !== null) updateConfig(editingIndex, config);
        }}
      />
    </div>
  );
}
