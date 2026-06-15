"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LogoUploader } from "@/components/course/logo-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPatch } from "@/lib/api";
import type { TenantOrg } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  initial: TenantOrg;
}

interface FormState {
  meta_title: string;
  meta_description: string;
  og_image_url: string;
}

function toFormState(org: TenantOrg): FormState {
  return {
    meta_title: org.meta_title ?? "",
    meta_description: org.meta_description ?? "",
    og_image_url: org.og_image_url ?? "",
  };
}

// Convert "" → null on the wire so clearing a field actually clears the DB row
// instead of persisting an empty string.
function nullable(s: string): string | null {
  const trimmed = s.trim();
  return trimmed === "" ? null : trimmed;
}

export function SeoEditor({ orgSlug, initial }: Props) {
  const router = useRouter();
  const initialForm = useMemo(() => toFormState(initial), [initial]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  function patchForm(p: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function onSave() {
    setError(null);
    setIsSaving(true);
    try {
      // PATCH only the SEO fields - the org route uses exclude_unset, so the
      // rest of the org's settings are left untouched.
      await apiPatch<TenantOrg>(
        `/api/v1/orgs/${orgSlug}`,
        {
          meta_title: nullable(form.meta_title),
          meta_description: nullable(form.meta_description),
          og_image_url: nullable(form.og_image_url),
        },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners can edit SEO settings.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("One of the fields failed validation. Check the title and description length.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end gap-3">
        {savedAt && !isDirty && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved.</span>
        )}
        <Button onClick={onSave} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Search &amp; social
        </h2>
        <p className="text-xs text-muted-foreground">
          How your site appears in search results and when shared on social
          media. Leave the title or description blank to fall back to your
          organization name and the description from Settings.
        </p>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Meta title</Label>
          <Input
            value={form.meta_title}
            onChange={(e) => patchForm({ meta_title: e.target.value })}
            maxLength={70}
            placeholder={initial.name}
          />
          <p className="text-xs text-muted-foreground">
            The clickable headline in search results. Aim for under 60 characters.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Meta description</Label>
          <Textarea
            value={form.meta_description}
            onChange={(e) => patchForm({ meta_description: e.target.value })}
            rows={3}
            maxLength={200}
            placeholder={initial.description ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            The snippet under your title in search results. Aim for 150–160 characters.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Social share image</Label>
          <p className="text-xs text-muted-foreground">
            Shown when your site is shared on social media. Use a 1200×630 image
            for the sharpest result.
          </p>
          <LogoUploader
            orgSlug={orgSlug}
            value={form.og_image_url}
            onChange={(url) => patchForm({ og_image_url: url })}
            purpose="organization_og_image"
          />
        </div>
      </section>
    </div>
  );
}
