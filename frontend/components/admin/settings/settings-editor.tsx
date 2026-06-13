"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DomainStatusPanel } from "@/components/admin/settings/domain-status-panel";
import { LogoUploader } from "@/components/course/logo-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPatch } from "@/lib/api";
import type { SocialLink, SocialPlatform, TenantOrg } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  initial: TenantOrg;
}

const PLATFORM_OPTIONS: ReadonlyArray<{ value: SocialPlatform; label: string }> = [
  { value: "website", label: "Website" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "github", label: "GitHub" },
];

interface FormState {
  name: string;
  description: string;
  logo_url: string;
  tagline: string;
  footer_text: string;
  contact_email: string;
  social_links: SocialLink[];
  custom_domain: string;
}

function toFormState(org: TenantOrg): FormState {
  return {
    name: org.name,
    description: org.description ?? "",
    logo_url: org.logo_url ?? "",
    tagline: org.tagline ?? "",
    footer_text: org.footer_text ?? "",
    contact_email: org.contact_email ?? "",
    social_links: org.social_links,
    custom_domain: org.custom_domain ?? "",
  };
}

// Convert "" → null on the wire so empty form fields actually clear DB rows
// instead of being persisted as empty strings.
function nullable(s: string): string | null {
  const trimmed = s.trim();
  return trimmed === "" ? null : trimmed;
}

export function SettingsEditor({ orgSlug, initial }: Props) {
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

  function addSocial() {
    if (form.social_links.length >= 16) return;
    patchForm({
      social_links: [...form.social_links, { platform: "website", url: "" }],
    });
  }

  function updateSocial(idx: number, p: Partial<SocialLink>) {
    patchForm({
      social_links: form.social_links.map((s, i) => (i === idx ? { ...s, ...p } : s)),
    });
  }

  function removeSocial(idx: number) {
    patchForm({
      social_links: form.social_links.filter((_, i) => i !== idx),
    });
  }

  async function onSave() {
    setError(null);
    setIsSaving(true);
    try {
      // Drop any incomplete social rows before sending - empty URLs would
      // fail server-side validation with a confusing 422.
      const cleanedSocials = form.social_links.filter((s) => s.url.trim() !== "");
      await apiPatch<TenantOrg>(
        `/api/v1/orgs/${orgSlug}`,
        {
          name: form.name.trim(),
          description: nullable(form.description),
          logo_url: nullable(form.logo_url),
          tagline: nullable(form.tagline),
          footer_text: nullable(form.footer_text),
          contact_email: nullable(form.contact_email),
          social_links: cleanedSocials,
          custom_domain: nullable(form.custom_domain),
        },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      setSavedAt(Date.now());
      // Pull fresh data from the server (rather than mutating local state)
      // - keeps us honest about what was actually persisted, including any
      // normalization the backend applied.
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners can edit organization settings.");
      } else if (err instanceof ApiError && (err.status === 400 || err.status === 409)) {
        // Domain guard errors carry actionable detail (platform domain,
        // already claimed) - show them verbatim.
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 422) {
        setError("One of the fields failed validation. Check email, URLs, and domain.");
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

      <Section title="Identity">
        <Field label="Organization name" required>
          <Input
            value={form.name}
            onChange={(e) => patchForm({ name: e.target.value })}
            maxLength={255}
            required
          />
        </Field>
        <Field
          label="Tagline"
          hint="One line that sits under your name in the navbar."
        >
          <Input
            value={form.tagline}
            onChange={(e) => patchForm({ tagline: e.target.value })}
            maxLength={140}
            placeholder="e.g. Practical FastAPI courses."
          />
        </Field>
        <Field label="Description" hint="Used as the meta description for SEO.">
          <Textarea
            value={form.description}
            onChange={(e) => patchForm({ description: e.target.value })}
            rows={3}
            maxLength={500}
          />
        </Field>
      </Section>

      <Section title="Logo">
        <p className="text-xs text-muted-foreground">
          Use a transparent PNG or SVG so it reads on both light and dark
          backgrounds. There are no theme overrides, so pick one image that
          works in both.
        </p>
        <LogoUploader
          orgSlug={orgSlug}
          value={form.logo_url}
          onChange={(url) => patchForm({ logo_url: url })}
          purpose="organization_logo"
        />
        {form.logo_url && (
          <div className="grid grid-cols-2 gap-3">
            <LogoPreview url={form.logo_url} variant="light" />
            <LogoPreview url={form.logo_url} variant="dark" />
          </div>
        )}
      </Section>

      <Section title="Contact">
        <Field
          label="Contact email"
          hint="Shown on your footer and contact page (when set up)."
        >
          <Input
            type="email"
            value={form.contact_email}
            onChange={(e) => patchForm({ contact_email: e.target.value })}
            maxLength={255}
            placeholder="hello@yourdomain.com"
          />
        </Field>
        <Field
          label="Footer text"
          hint="Free-text line shown at the bottom of every page. Leave empty to auto-show '© <year> <name>'."
        >
          <Input
            value={form.footer_text}
            onChange={(e) => patchForm({ footer_text: e.target.value })}
            maxLength={500}
            placeholder="© 2026 Acme Academy. All rights reserved."
          />
        </Field>
      </Section>

      <Section title="Custom domain">
        <Field
          label="Domain"
          hint="Your own domain for this site (e.g. learn.yourdomain.com or yourdomain.com), without https:// or paths. Clear and save to disconnect."
        >
          <Input
            value={form.custom_domain}
            onChange={(e) => patchForm({ custom_domain: e.target.value })}
            maxLength={253}
            placeholder="learn.yourdomain.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <DomainStatusPanel orgSlug={orgSlug} />
      </Section>

      <Section title="Social links">
        <p className="text-xs text-muted-foreground">
          Rendered as icons in your footer. Empty rows are dropped on save.
        </p>
        {form.social_links.map((social, idx) => (
          <div key={idx} className="flex gap-2">
            <select
              className="h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={social.platform}
              onChange={(e) =>
                updateSocial(idx, { platform: e.target.value as SocialPlatform })
              }
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <Input
              value={social.url}
              onChange={(e) => updateSocial(idx, { url: e.target.value })}
              maxLength={2048}
              placeholder="https://…"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSocial(idx)}
              aria-label="Remove social link"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSocial}
          disabled={form.social_links.length >= 16}
        >
          <Plus className="mr-2 size-4" />
          Add social link
        </Button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Render the logo against both a light and a dark surface so the admin can
// see, before saving, whether their chosen image actually reads against
// both themes. Sidesteps a whole category of "my logo looks bad in dark
// mode" support tickets.
function LogoPreview({ url, variant }: { url: string; variant: "light" | "dark" }) {
  const bg = variant === "light" ? "bg-white" : "bg-neutral-900";
  return (
    <div
      className={`flex h-24 items-center justify-center rounded-md border border-border ${bg}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="max-h-16 max-w-[80%] object-contain" />
    </div>
  );
}
