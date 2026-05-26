"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiPut } from "@/lib/api";
import type { NavLink, NavLinkLocation } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  location: NavLinkLocation;
  title: string;
  description: string;
  initialLinks: NavLink[];
}

interface DraftLink {
  // Stable React key. Server-loaded → row id; new (unsaved) → "new-…" token.
  clientId: string;
  label: string;
  href: string;
  open_in_new_tab: boolean;
  is_enabled: boolean;
}

function fromServer(links: NavLink[]): DraftLink[] {
  return links.map((l) => ({
    clientId: l.id,
    label: l.label,
    href: l.href,
    open_in_new_tab: l.open_in_new_tab,
    is_enabled: l.is_enabled,
  }));
}

function makeClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function NavLinksEditor({
  orgSlug,
  location,
  title,
  description,
  initialLinks,
}: Props) {
  const router = useRouter();
  const initial = useMemo(() => fromServer(initialLinks), [initialLinks]);

  const [drafts, setDrafts] = useState<DraftLink[]>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(drafts) !== JSON.stringify(initial),
    [drafts, initial],
  );

  function addLink() {
    setDrafts((prev) => [
      ...prev,
      {
        clientId: `new-${makeClientId()}`,
        label: "",
        href: "",
        open_in_new_tab: true,
        is_enabled: true,
      },
    ]);
  }

  function removeLink(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function moveLink(index: number, delta: -1 | 1) {
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function patchLink(index: number, p: Partial<DraftLink>) {
    setDrafts((prev) => prev.map((l, i) => (i === index ? { ...l, ...p } : l)));
  }

  async function onSave() {
    setError(null);
    setIsSaving(true);
    try {
      // Drop rows where label or href is blank — these would 422 server-side
      // with a confusing error. The admin can refill them later.
      const cleaned = drafts.filter(
        (d) => d.label.trim() !== "" && d.href.trim() !== "",
      );
      const saved = await apiPut<NavLink[]>(
        `/api/v1/admin/nav-links?location=${location}`,
        {
          links: cleaned.map((d) => ({
            label: d.label.trim(),
            href: d.href.trim(),
            open_in_new_tab: d.open_in_new_tab,
            is_enabled: d.is_enabled,
          })),
        },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      setDrafts(fromServer(saved));
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners can edit navigation links.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("One of the rows failed validation. Check labels and URLs.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !isDirty && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved.</span>
          )}
          <Button onClick={onSave} disabled={!isDirty || isSaving} size="sm">
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </Card>
      )}

      {drafts.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No links yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {drafts.map((link, index) => (
            <li
              key={link.clientId}
              className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_2fr_auto]"
            >
              <Input
                value={link.label}
                onChange={(e) => patchLink(index, { label: e.target.value })}
                placeholder="Label"
                maxLength={64}
              />
              <Input
                value={link.href}
                onChange={(e) => patchLink(index, { href: e.target.value })}
                placeholder="https://… or /path"
                maxLength={2048}
              />
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveLink(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveLink(index, 1)}
                  disabled={index === drafts.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLink(index)}
                  aria-label="Delete link"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:col-span-3">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={link.open_in_new_tab}
                    onCheckedChange={(v) => patchLink(index, { open_in_new_tab: v })}
                  />
                  Open in new tab
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={link.is_enabled}
                    onCheckedChange={(v) => patchLink(index, { is_enabled: v })}
                  />
                  Visible
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addLink}>
        <Plus className="mr-2 size-4" />
        Add link
      </Button>
    </section>
  );
}
