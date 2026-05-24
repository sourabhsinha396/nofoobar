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

type SupportedContentType = "article" | "video";

interface LessonResponse {
  id: string;
  slug: string;
}

interface Props {
  orgSlug: string;
  courseSlug: string;
  sectionSlug: string;
  sectionTitle: string;
}

const CONTENT_TYPE_OPTIONS: Array<{ value: SupportedContentType; label: string; hint: string }> = [
  { value: "article", label: "Article", hint: "Markdown body" },
  { value: "video", label: "Video", hint: "URL + optional duration" },
];

export function CreateLessonForm({ orgSlug, courseSlug, sectionSlug, sectionTitle }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [contentType, setContentType] = useState<SupportedContentType>("article");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slugLooksValid = slug === "" || SLUG_PATTERN.test(slug);

  function buildContent(): Record<string, unknown> | null {
    if (contentType === "article") {
      if (!body.trim()) {
        setError("Article body cannot be empty.");
        return null;
      }
      return { content_type: "article", body };
    }
    if (!videoUrl.trim()) {
      setError("Video URL is required.");
      return null;
    }
    const payload: Record<string, unknown> = { content_type: "video", url: videoUrl.trim() };
    if (durationSeconds.trim()) {
      const parsed = Number.parseInt(durationSeconds, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Duration must be a non-negative integer.");
        return null;
      }
      payload.duration_seconds = parsed;
    }
    return payload;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!SLUG_PATTERN.test(slug)) {
      setError(
        "Slug must start with a lowercase letter and contain only lowercase letters, digits, and hyphens.",
      );
      return;
    }

    const content = buildContent();
    if (!content) return;

    setIsSubmitting(true);
    try {
      await apiPost<LessonResponse>(
        `/api/v1/courses/${courseSlug}/sections/${sectionSlug}/lessons`,
        { slug, title, content },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      router.push(tenantPath(orgSlug, `/admin/courses/${courseSlug}/sections/${sectionSlug}`));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("That slug is already used in this section. Try another.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can create lessons.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Section no longer exists.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError(err.message || "Please check the form fields.");
      } else {
        setError(err instanceof Error ? err.message : "Could not create lesson.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full p-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl font-semibold tracking-tight">Create a lesson</CardTitle>
        <CardDescription className="text-base">
          Adding to <span className="font-mono">{sectionTitle}</span>. Labs and quizzes get their
          own forms in a future update.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                    contentType === opt.value
                      ? "border-foreground/40 bg-surface-subtle"
                      : "border-input hover:border-foreground/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="content_type"
                    value={opt.value}
                    checked={contentType === opt.value}
                    onChange={() => setContentType(opt.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

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

          {contentType === "article" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="body" className="text-sm font-medium">
                Body <span className="text-muted-foreground">(markdown)</span>
              </Label>
              <Textarea
                id="body"
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}

          {contentType === "video" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="video_url" className="text-sm font-medium">
                  Video URL
                </Label>
                <Input
                  id="video_url"
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="h-11 text-base"
                  placeholder="https://..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="duration" className="text-sm font-medium">
                  Duration <span className="text-muted-foreground">(seconds, optional)</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min={0}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? "Creating..." : "Create lesson"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
