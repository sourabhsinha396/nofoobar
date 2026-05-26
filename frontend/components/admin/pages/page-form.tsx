"use client";

import type { JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ArticleEditor } from "@/components/lesson/article-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiPatch, apiPost } from "@/lib/api";
import { tenantPath } from "@/lib/orgs";
import type { OrganizationPage, PageKind } from "@/lib/tenant";

const SLUG_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

const EMPTY_DOC: JSONContent = { type: "doc", content: [] };

const KIND_OPTIONS: ReadonlyArray<{ value: PageKind; label: string }> = [
  { value: "terms", label: "Terms & conditions" },
  { value: "privacy", label: "Privacy policy" },
  { value: "refund", label: "Refund & cancellation policy" },
  { value: "contact", label: "Contact us" },
  { value: "custom", label: "Custom" },
];

interface CreateModeProps {
  mode: "create";
  orgSlug: string;
}

interface EditModeProps {
  mode: "edit";
  orgSlug: string;
  initial: OrganizationPage;
}

type Props = CreateModeProps | EditModeProps;

export function PageForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : null;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState<PageKind>(initial?.kind ?? "custom");
  const [body, setBody] = useState<JSONContent>(
    initial?.body as JSONContent | undefined ?? EMPTY_DOC,
  );
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [showInFooter, setShowInFooter] = useState(initial?.show_in_footer ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugLooksValid = slug === "" || SLUG_PATTERN.test(slug);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!SLUG_PATTERN.test(slug)) {
      setError(
        "Slug must start with a lowercase letter and contain only lowercase letters, digits, and hyphens.",
      );
      return;
    }

    setIsSaving(true);
    const payload = {
      slug,
      title,
      body,
      kind,
      is_published: isPublished,
      show_in_footer: showInFooter,
    };

    try {
      if (props.mode === "create") {
        await apiPost<OrganizationPage>(
          "/api/v1/admin/pages",
          payload,
          { headers: { "X-Tenant-Slug": props.orgSlug } },
        );
      } else {
        await apiPatch<OrganizationPage>(
          `/api/v1/admin/pages/${props.initial.slug}`,
          payload,
          { headers: { "X-Tenant-Slug": props.orgSlug } },
        );
      }
      router.push(tenantPath(props.orgSlug, "/admin/pages"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("A page with that slug already exists.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only owners can edit pages.");
      } else if (err instanceof ApiError && err.status === 422) {
        // Most common 422 here is the reserved-slug rejection from the
        // backend. Surface the detail so the admin knows which slug to
        // pick instead.
        setError(err.message || "Please check the form fields.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save page.");
      }
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {error && (
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Title
          </Label>
          <Input
            id="title"
            type="text"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug" className="text-sm font-medium">
            Slug
          </Label>
          <Input
            id="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            aria-invalid={!slugLooksValid}
          />
          <p className="text-xs text-muted-foreground">
            Becomes the public URL: <code>/your-slug</code>. Lowercase, digits, hyphens.
            Reserved (e.g. <code>courses</code>, <code>login</code>) are rejected.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="kind" className="text-sm font-medium">
          Kind
        </Label>
        <select
          id="kind"
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as PageKind)}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Tagging legal pages helps payment-provider onboarding (Razorpay
          requires a deterministic refund-policy URL).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="body" className="text-sm font-medium">
          Body
        </Label>
        <ArticleEditor
          id="body"
          value={body}
          onChange={setBody}
          orgSlug={props.orgSlug}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Visibility</p>
          <p className="text-xs text-muted-foreground">
            Published pages are reachable at the public URL. Unpublished pages
            return 404 to the world but stay editable here.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          Published
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Show in footer</p>
          <p className="text-xs text-muted-foreground">
            Adds this page to the footer link list (only when published).
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showInFooter} onCheckedChange={setShowInFooter} />
          Show in footer
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? "Saving…"
            : props.mode === "create"
              ? "Create page"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
