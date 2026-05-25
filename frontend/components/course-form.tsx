"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPatch, apiPost } from "@/lib/api";
import { tenantPath } from "@/lib/orgs";
import { convertPpp } from "@/lib/pricing";
import type { Currency } from "@/lib/tenant";

const SLUG_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

interface CourseResponse {
  id: string;
  slug: string;
  title: string;
}

export interface CourseInitialValues {
  slug: string;
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
}

const CURRENCY_OPTIONS: ReadonlyArray<{ code: string; label: string }> = [
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "INR", label: "INR (₹)" },
  { code: "AUD", label: "AUD (A$)" },
];

interface CreateModeProps {
  mode: "create";
  orgSlug: string;
}

interface EditModeProps {
  mode: "edit";
  orgSlug: string;
  courseSlug: string;
  initial: CourseInitialValues;
}

type Props = CreateModeProps | EditModeProps;

export function CourseForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  // Price stored as the major unit (e.g. "29" for $29.00) for UX; converted
  // to cents at submit time. Empty string means free.
  const [priceMajor, setPriceMajor] = useState(
    initial?.price_cents != null ? (initial.price_cents / 100).toString() : "",
  );
  const [currency, setCurrency] = useState<Currency>(
    (initial?.currency as Currency) ?? "USD",
  );

  // Swap currency + PPP-convert the price field so the creator gets a
  // sensible starting number in the new market (e.g. $29 → ₹1885, not
  // ₹29). Field stays editable for overrides.
  function handleCurrencyChange(next: Currency) {
    const trimmed = priceMajor.trim();
    if (trimmed !== "" && next !== currency) {
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setPriceMajor(String(convertPpp(parsed, currency, next)));
      }
    }
    setCurrency(next);
  }
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    const payloadDescription = description.trim() || null;

    let priceCents: number | null = null;
    const trimmedPrice = priceMajor.trim();
    if (trimmedPrice !== "") {
      const parsed = Number(trimmedPrice);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Price must be zero or positive.");
        setIsSubmitting(false);
        return;
      }
      priceCents = Math.round(parsed * 100);
    }
    const payload = {
      slug,
      title,
      description: payloadDescription,
      price_cents: priceCents,
      currency,
    };

    try {
      if (props.mode === "create") {
        await apiPost<CourseResponse>(
          "/api/v1/courses",
          payload,
          { headers: { "X-Tenant-Slug": props.orgSlug } },
        );
        router.push(tenantPath(props.orgSlug, "/admin"));
      } else {
        await apiPatch<CourseResponse>(
          `/api/v1/courses/${props.courseSlug}`,
          payload,
          { headers: { "X-Tenant-Slug": props.orgSlug } },
        );
        router.push(tenantPath(props.orgSlug, `/admin/courses/${slug}`));
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("That slug is already used in this organization. Try another.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can edit courses.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Course no longer exists.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("Please check the form fields.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save course.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full p-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl font-semibold tracking-tight">
          {props.mode === "create" ? "Create a course" : "Edit course"}
        </CardTitle>
        <CardDescription className="text-base">
          {props.mode === "create"
            ? "You can edit the title and description later. The slug becomes part of the course URL."
            : "Edit the title, slug, or description. Sections and lessons stay where they are."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
              className="h-11 text-base"
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
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              aria-invalid={!slugLooksValid}
              className="h-11 font-mono text-base"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, digits, and hyphens. Must start with a letter. Max 63 characters.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price" className="text-sm font-medium">
                Price <span className="text-muted-foreground">(leave blank for free)</span>
              </Label>
              <Input
                id="price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={priceMajor}
                onChange={(e) => setPriceMajor(e.target.value)}
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency" className="text-sm font-medium">
                Currency
              </Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                className="h-11 rounded-md border border-input bg-background px-3 text-base"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="description"
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting
              ? props.mode === "create"
                ? "Creating..."
                : "Saving..."
              : props.mode === "create"
                ? "Create course"
                : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
