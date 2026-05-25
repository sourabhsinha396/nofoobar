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
import { ApiError, apiPatch } from "@/lib/api";
import type { Lesson, LessonContentType } from "@/lib/tenant";

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
}

function SortableRow({ lesson, index, href }: RowProps) {
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
          <Link
            href={href}
            className="flex-1 transition-colors hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <p className="font-medium">{lesson.title}</p>
              <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {CONTENT_TYPE_LABELS[lesson.content_type]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{lesson.slug}</p>
            {preview && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
            )}
          </Link>
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
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
