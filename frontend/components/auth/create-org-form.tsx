"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";

const SLUG_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

interface OrgResponse {
  id: string;
  slug: string;
  name: string;
}

export function CreateOrgForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slugLooksValid = slug === "" || SLUG_PATTERN.test(slug);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!SLUG_PATTERN.test(slug)) {
      setError("Slug must start with a lowercase letter and contain only lowercase letters, digits, and hyphens.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost<OrgResponse>("/api/v1/orgs", { slug, name });
      router.push("/me");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("That slug is already taken. Try another.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("Please check the slug format.");
      } else {
        setError(err instanceof Error ? err.message : "Could not create organization.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full p-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl font-semibold tracking-tight">Create an organization</CardTitle>
        <CardDescription className="text-base">
          The slug becomes your subdomain — e.g. <span className="font-mono">acme</span> →{" "}
          <span className="font-mono">acme.algoholic.app</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Organization name
            </Label>
            <Input
              id="name"
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? "Creating..." : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
