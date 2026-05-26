"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiPatch } from "@/lib/api";
import type { Lesson, LessonContentType, LessonVisibility } from "@/lib/tenant";
import { cn } from "@/lib/utils";

interface Props {
  orgSlug: string;
  courseSlug: string;
  sectionSlug: string;
  lessonsPrefix: string; // e.g. /admin/courses/intro/sections/getting-started/lessons
  initialLessons: Lesson[];
}

const CONTENT_TYPE_LABELS: Record<LessonContentType, string> = {
  article: "Article",
  video: "Video",
  lab: "Lab",
  quiz: "Quiz",
};

function lessonPreview(lesson: Lesson): string {
  switch (lesson.content_type) {
    case "article": {
      const body = typeof lesson.content.body === "string" ? lesson.content.body : "";
      return body.length > 120 ? `${body.slice(0, 120)}…` : body;
    }
    case "video":
      return typeof lesson.content.url === "string" ? lesson.content.url : "";
    case "lab":
      return typeof lesson.content.lab_id === "string"
        ? `Lab ${lesson.content.lab_id}`
        : "";
    case "quiz": {
      const questions = Array.isArray(lesson.content.questions)
        ? lesson.content.questions
        : [];
      return `${questions.length} question${questions.length === 1 ? "" : "s"}`;
    }
  }
}

interface RowProps {
  lesson: Lesson;
  index: number;
  href: string;
  onToggleVisibility: (lesson: Lesson, next: LessonVisibility) => void;
  isTogglingVisibility: boolean;
}

function VisibilityToggle({
  visibility,
  onToggle,
  disabled,
}: {
  visibility: LessonVisibility;
  onToggle: (next: LessonVisibility) => void;
  disabled: boolean;
}) {
  const isPublished = visibility === "published";
  // Switch + label inside a bordered cluster — the chrome makes it visually
  // distinct from the static badges (ARTICLE / FREE PREVIEW) sitting next to
  // it, so creators read it as an interactive control rather than just another
  // tag. The whole cluster is a <label> so clicking the text flips the switch.
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-input bg-card px-2 py-0.5 text-xs font-medium transition-colors",
        "hover:bg-accent/50",
        disabled && "cursor-not-allowed opacity-60",
      )}
      title={
        isPublished
          ? "Switch off to unpublish (hide from learners)"
          : "Switch on to publish (make visible to learners)"
      }
    >
      <Switch
        size="sm"
        checked={isPublished}
        disabled={disabled}
        onCheckedChange={(checked) => onToggle(checked ? "published" : "draft")}
        aria-label={`Lesson visibility, currently ${isPublished ? "published" : "draft"}`}
      />
      <span className={isPublished ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
        {isPublished ? "Published" : "Draft"}
      </span>
    </label>
  );
}

function SortableRow({
  lesson,
  index,
  href,
  onToggleVisibility,
  isTogglingVisibility,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const preview = lessonPreview(lesson);
  return (
    <li ref={setNodeRef} style={style}>
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Drag to reorder lesson ${lesson.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="mt-1 font-mono text-xs text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          {/* Title + badges live side-by-side. Only the title is a Link so the
              visibility toggle (a <button>) isn't an invalid descendant of <a>. */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={href}
                className="font-medium transition-colors hover:text-foreground"
              >
                {lesson.title}
              </Link>
              <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {CONTENT_TYPE_LABELS[lesson.content_type]}
              </span>
              <VisibilityToggle
                visibility={lesson.visibility}
                onToggle={(next) => onToggleVisibility(lesson, next)}
                disabled={isTogglingVisibility}
              />
              {lesson.is_free_preview && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
                  Free preview
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{lesson.slug}</p>
            {preview && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
            )}
          </div>
        </div>
      </Card>
    </li>
  );
}

export function SortableLessonList({
  orgSlug,
  courseSlug,
  sectionSlug,
  lessonsPrefix,
  initialLessons,
}: Props) {
  const [lessons, setLessons] = useState(initialLessons);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = lessons;
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    setLessons(reordered);
    setError(null);

    try {
      await apiPatch(
        `/api/v1/courses/${courseSlug}/sections/${sectionSlug}/lessons/reorder`,
        { ids: reordered.map((l) => l.id) },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
    } catch (err) {
      setLessons(previous);
      setError(
        err instanceof ApiError ? err.message : "Could not save the new order.",
      );
    }
  }

  async function toggleVisibility(lesson: Lesson, next: LessonVisibility) {
    if (togglingId) return; // ignore concurrent toggles on the same row
    const previous = lessons;
    setLessons((current) =>
      current.map((l) => (l.id === lesson.id ? { ...l, visibility: next } : l)),
    );
    setError(null);
    setTogglingId(lesson.id);

    try {
      await apiPatch(
        `/api/v1/courses/${courseSlug}/sections/${sectionSlug}/lessons/${lesson.slug}`,
        { visibility: next },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
    } catch (err) {
      setLessons(previous);
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can change visibility.");
      } else {
        setError(err instanceof ApiError ? err.message : "Could not update visibility.");
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <DndContext
        id="sortable-lessons"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-3">
            {lessons.map((lesson, index) => (
              <SortableRow
                key={lesson.id}
                lesson={lesson}
                index={index}
                href={`${lessonsPrefix}/${lesson.slug}`}
                onToggleVisibility={toggleVisibility}
                isTogglingVisibility={togglingId === lesson.id}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
