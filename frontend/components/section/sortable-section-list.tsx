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
import type { Section } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  courseSlug: string;
  sectionsPrefix: string; // e.g. /admin/courses/intro/sections
  initialSections: Section[];
}

interface RowProps {
  section: Section;
  index: number;
  href: string;
}

function SortableRow({ section, index, href }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Drag to reorder section ${section.title}`}
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
            <p className="font-medium">{section.title}</p>
            <p className="text-sm text-muted-foreground">{section.slug}</p>
            {section.description && (
              <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
            )}
          </Link>
        </div>
      </Card>
    </li>
  );
}

export function SortableSectionList({
  orgSlug,
  courseSlug,
  sectionsPrefix,
  initialSections,
}: Props) {
  const [sections, setSections] = useState(initialSections);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = sections;
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);
    setError(null);

    try {
      await apiPatch(
        `/api/v1/courses/${courseSlug}/sections/reorder`,
        { ids: reordered.map((s) => s.id) },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
    } catch (err) {
      setSections(previous);
      setError(
        err instanceof ApiError ? err.message : "Could not save the new order.",
      );
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <DndContext
        id="sortable-sections"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-3">
            {sections.map((section, index) => (
              <SortableRow
                key={section.id}
                section={section}
                index={index}
                href={`${sectionsPrefix}/${section.slug}`}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
