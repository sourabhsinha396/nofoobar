"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPost } from "@/lib/api";
import { tenantPath } from "@/lib/orgs";

const SLUG_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

interface CourseResponse {
  id: string;
  slug: string;
  title: string;
}

interface Props {
  orgSlug: string;
}

export function CreateCourseForm({ orgSlug }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
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
    try {
      await apiPost<CourseResponse>(
        "/api/v1/courses",
        { slug, title, description: description.trim() || null },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      router.push(tenantPath(orgSlug, "/admin"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("That slug is already used in this organization. Try another.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can create courses.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("Please check the form fields.");
      } else {
        setError(err instanceof Error ? err.message : "Could not create course.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full p-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl font-semibold tracking-tight">Create a course</CardTitle>
        <CardDescription className="text-base">
          You can edit the title and description later. The slug becomes part of the course URL.
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
            {isSubmitting ? "Creating..." : "Create course"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
