"use client";

import type { JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ArticleEditor } from "@/components/lesson/article-editor";
import { VideoLessonPicker } from "@/components/lesson/video-lesson-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPatch, apiPost } from "@/lib/api";
import { tenantPath } from "@/lib/orgs";
import { EMPTY_TIPTAP_DOC } from "@/lib/tiptap-extensions";
import type { LessonContentType } from "@/lib/tenant";

const SLUG_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

type SupportedContentType = "article" | "video";

interface LessonResponse {
  id: string;
  slug: string;
}

export interface LessonInitialValues {
  slug: string;
  title: string;
  content_type: LessonContentType;
  content: Record<string, unknown>;
}

interface CreateModeProps {
  mode: "create";
  orgSlug: string;
  courseSlug: string;
  sectionSlug: string;
  sectionTitle: string;
}

interface EditModeProps {
  mode: "edit";
  orgSlug: string;
  courseSlug: string;
  sectionSlug: string;
  lessonSlug: string;
  initial: LessonInitialValues;
}

type Props = CreateModeProps | EditModeProps;

const CONTENT_TYPE_OPTIONS: Array<{ value: SupportedContentType; label: string; hint: string }> = [
  { value: "article", label: "Article", hint: "Rich text body" },
  { value: "video", label: "Video", hint: "URL + optional duration" },
];

function isJsonContent(value: unknown): value is JSONContent {
  return typeof value === "object" && value !== null && "type" in value;
}

function isDocEmpty(doc: JSONContent): boolean {
  function hasText(node: JSONContent): boolean {
    if (typeof node.text === "string" && node.text.trim().length > 0) {
      return true;
    }
    if (Array.isArray(node.content)) {
      return node.content.some(hasText);
    }
    return false;
  }
  return !hasText(doc);
}

export function LessonForm(props: Props) {
  const router = useRouter();

  const initial = props.mode === "edit" ? props.initial : null;
  const lockedContentType: LessonContentType | null = initial ? initial.content_type : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [contentType, setContentType] = useState<LessonContentType>(
    initial?.content_type ?? "article",
  );
  const [body, setBody] = useState<JSONContent>(() => {
    if (initial?.content_type === "article" && isJsonContent(initial.content.body)) {
      return initial.content.body;
    }
    return EMPTY_TIPTAP_DOC;
  });
  const [videoUrl, setVideoUrl] = useState(
    initial?.content_type === "video" && typeof initial.content.url === "string"
      ? initial.content.url
      : "",
  );
  const [durationSeconds, setDurationSeconds] = useState(
    initial?.content_type === "video" && typeof initial.content.duration_seconds === "number"
      ? String(initial.content.duration_seconds)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoPickerBusy, setVideoPickerBusy] = useState(false);

  const slugLooksValid = slug === "" || SLUG_PATTERN.test(slug);

  function buildContent(): Record<string, unknown> | null {
    if (contentType === "article") {
      if (isDocEmpty(body)) {
        setError("Article body cannot be empty.");
        return null;
      }
      return { content_type: "article", body };
    }
    if (contentType === "video") {
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
    // lab/quiz aren't edited via this form yet
    return null;
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
      if (props.mode === "create") {
        await apiPost<LessonResponse>(
          `/api/v1/courses/${props.courseSlug}/sections/${props.sectionSlug}/lessons`,
          { slug, title, content },
          { headers: { "X-Tenant-Slug": props.orgSlug } },
        );
        router.push(
          tenantPath(props.orgSlug, `/admin/courses/${props.courseSlug}/sections/${props.sectionSlug}`),
        );
      } else {
        await apiPatch<LessonResponse>(
          `/api/v1/courses/${props.courseSlug}/sections/${props.sectionSlug}/lessons/${props.lessonSlug}`,
          { slug, title, content },
          { headers: { "X-Tenant-Slug": props.orgSlug } },
        );
        // Slug may have changed — navigate to the new URL.
        router.push(
          tenantPath(
            props.orgSlug,
            `/admin/courses/${props.courseSlug}/sections/${props.sectionSlug}/lessons/${slug}`,
          ),
        );
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(err.message || "Slug already used in this section.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can edit lessons.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Lesson no longer exists.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError(err.message || "Please check the form fields.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save lesson.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full p-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl font-semibold tracking-tight">
          {props.mode === "create" ? "Create a lesson" : "Edit lesson"}
        </CardTitle>
        <CardDescription className="text-base">
          {props.mode === "create" ? (
            <>
              Adding to <span className="font-mono">{props.sectionTitle}</span>. Labs and quizzes
              get their own forms in a future update.
            </>
          ) : (
            <>Content type can&apos;t change after creation. Delete and recreate to switch types.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPE_OPTIONS.map((opt) => {
                const isLocked =
                  lockedContentType !== null && lockedContentType !== opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex flex-col gap-1 rounded-lg border p-3 transition-colors ${
                      contentType === opt.value
                        ? "border-foreground/40 bg-surface-subtle"
                        : "border-input hover:border-foreground/20"
                    } ${isLocked ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name="content_type"
                      value={opt.value}
                      checked={contentType === opt.value}
                      disabled={lockedContentType !== null}
                      onChange={() => setContentType(opt.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.hint}</span>
                  </label>
                );
              })}
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
                Body
              </Label>
              <ArticleEditor
                id="body"
                value={body}
                onChange={setBody}
                orgSlug={props.orgSlug}
              />
            </div>
          )}

          {contentType === "video" && (
            <>
              <VideoLessonPicker
                url={videoUrl}
                orgSlug={props.orgSlug}
                onBusyChange={setVideoPickerBusy}
                onChange={(next) => {
                  setVideoUrl(next.url);
                  if (next.durationSeconds !== undefined) {
                    // Auto-fill from Mux poll, but only if the creator hasn't
                    // already typed one. Manual entries beat auto-fill.
                    setDurationSeconds((prev) =>
                      prev.trim() === "" ? String(next.durationSeconds) : prev,
                    );
                  }
                }}
              />
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
          <Button type="submit" disabled={isSubmitting || videoPickerBusy} size="lg">
            {videoPickerBusy
              ? "Wait for upload to finish…"
              : isSubmitting
                ? props.mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : props.mode === "create"
                  ? "Create lesson"
                  : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
