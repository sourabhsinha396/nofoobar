"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  FaqsConfig,
  FeaturedCoursesConfig,
  HeroConfig,
  HomepageBlockConfig,
  PublishedCourseSummary,
  StatsConfig,
  TestimonialsConfig,
} from "@/lib/tenant";

interface DraftBlock {
  clientId: string;
  config: HomepageBlockConfig;
  is_enabled: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: DraftBlock | null;
  courses: PublishedCourseSummary[];
  onConfigChange: (config: HomepageBlockConfig) => void;
}

const TYPE_TITLES: Record<HomepageBlockConfig["type"], string> = {
  hero: "Hero",
  stats: "Stats",
  featured_courses: "Featured courses",
  testimonials: "Testimonials",
  faqs: "Frequently asked questions",
};

const TYPE_DESCRIPTIONS: Record<HomepageBlockConfig["type"], string> = {
  hero: "Headline above the fold with an optional call-to-action.",
  stats: "1–4 highlight numbers (e.g. “500+ students”).",
  featured_courses: "Curated course cards. Leave the list empty to auto-show the latest 3.",
  testimonials: "Quotes from students.",
  faqs: "Common questions with collapsible answers.",
};

export function BlockEditSheet({ open, onOpenChange, block, courses, onConfigChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl gap-0 p-0 sm:max-w-xl">
        {block && (
          <>
            <SheetHeader className="border-b border-border p-6">
              <SheetTitle>{TYPE_TITLES[block.config.type]}</SheetTitle>
              <SheetDescription>{TYPE_DESCRIPTIONS[block.config.type]}</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto p-6">
              <BlockForm
                config={block.config}
                courses={courses}
                onChange={onConfigChange}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BlockForm({
  config,
  courses,
  onChange,
}: {
  config: HomepageBlockConfig;
  courses: PublishedCourseSummary[];
  onChange: (config: HomepageBlockConfig) => void;
}) {
  switch (config.type) {
    case "hero":
      return <HeroForm config={config} onChange={onChange} />;
    case "stats":
      return <StatsForm config={config} onChange={onChange} />;
    case "featured_courses":
      return <FeaturedCoursesForm config={config} courses={courses} onChange={onChange} />;
    case "testimonials":
      return <TestimonialsForm config={config} courses={courses} onChange={onChange} />;
    case "faqs":
      return <FaqsForm config={config} onChange={onChange} />;
  }
}

// --- Hero --------------------------------------------------------------------

function HeroForm({
  config,
  onChange,
}: {
  config: HeroConfig;
  onChange: (config: HeroConfig) => void;
}) {
  function patch(p: Partial<HeroConfig>) {
    onChange({ ...config, ...p });
  }
  return (
    <div className="space-y-5">
      <Field label="Headline" required>
        <Input
          value={config.headline}
          onChange={(e) => patch({ headline: e.target.value })}
          maxLength={255}
        />
      </Field>
      <Field label="Subheadline">
        <Textarea
          value={config.subheadline ?? ""}
          onChange={(e) => patch({ subheadline: e.target.value || null })}
          rows={2}
          maxLength={255}
        />
      </Field>
      <Field label="CTA label">
        <Input
          value={config.cta_label ?? ""}
          onChange={(e) => patch({ cta_label: e.target.value || null })}
          maxLength={255}
          placeholder="e.g. Browse courses"
        />
      </Field>
      <Field label="CTA href" hint="Relative path (e.g. /courses) or full URL.">
        <Input
          value={config.cta_href ?? ""}
          onChange={(e) => patch({ cta_href: e.target.value || null })}
          maxLength={2048}
          placeholder="/courses"
        />
      </Field>
      <Field label="Background image URL">
        <Input
          value={config.background_image_url ?? ""}
          onChange={(e) => patch({ background_image_url: e.target.value || null })}
          maxLength={2048}
          placeholder="https://…"
        />
      </Field>
    </div>
  );
}

// --- Stats -------------------------------------------------------------------

function StatsForm({
  config,
  onChange,
}: {
  config: StatsConfig;
  onChange: (config: StatsConfig) => void;
}) {
  function patchItem(idx: number, p: Partial<StatsConfig["items"][number]>) {
    onChange({
      ...config,
      items: config.items.map((it, i) => (i === idx ? { ...it, ...p } : it)),
    });
  }
  function addItem() {
    if (config.items.length >= 4) return;
    onChange({ ...config, items: [...config.items, { value: "", label: "" }] });
  }
  function removeItem(idx: number) {
    if (config.items.length <= 1) return;
    onChange({ ...config, items: config.items.filter((_, i) => i !== idx) });
  }
  return (
    <div className="space-y-5">
      <Field label="Heading" hint="Optional. Shown above the stats grid.">
        <Input
          value={config.heading ?? ""}
          onChange={(e) => onChange({ ...config, heading: e.target.value || null })}
          maxLength={255}
        />
      </Field>
      <div className="space-y-3">
        <Label className="text-sm font-medium">Items (1–4)</Label>
        {config.items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={item.value}
              onChange={(e) => patchItem(idx, { value: e.target.value })}
              placeholder="500+"
              className="w-1/3"
            />
            <Input
              value={item.label}
              onChange={(e) => patchItem(idx, { label: e.target.value })}
              placeholder="Students enrolled"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(idx)}
              disabled={config.items.length <= 1}
              aria-label="Remove item"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={config.items.length >= 4}
        >
          <Plus className="mr-2 size-4" />
          Add stat
        </Button>
      </div>
    </div>
  );
}

// --- Featured courses --------------------------------------------------------

function FeaturedCoursesForm({
  config,
  courses,
  onChange,
}: {
  config: FeaturedCoursesConfig;
  courses: PublishedCourseSummary[];
  onChange: (config: FeaturedCoursesConfig) => void;
}) {
  const selected = new Set(config.course_ids);
  function toggle(id: string) {
    const next = config.course_ids.includes(id)
      ? config.course_ids.filter((cid) => cid !== id)
      : [...config.course_ids, id];
    onChange({ ...config, course_ids: next });
  }
  function move(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= config.course_ids.length) return;
    const next = [...config.course_ids];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...config, course_ids: next });
  }
  // Preserve the admin's chosen order in the "Selected" list; show unselected
  // courses below.
  const byId = new Map(courses.map((c) => [c.id, c]));
  const selectedCourses = config.course_ids
    .map((id) => byId.get(id))
    .filter((c): c is PublishedCourseSummary => !!c);
  const unselectedCourses = courses.filter((c) => !selected.has(c.id));

  return (
    <div className="space-y-5">
      <Field label="Heading" hint="Defaults to “Featured courses”.">
        <Input
          value={config.heading ?? ""}
          onChange={(e) => onChange({ ...config, heading: e.target.value || null })}
          maxLength={255}
        />
      </Field>
      {courses.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No published courses yet. Publish a course first, then come back to feature it.
        </p>
      ) : (
        <>
          <div>
            <Label className="text-sm font-medium">Selected (in display order)</Label>
            {selectedCourses.length === 0 ? (
              <p className="mt-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                None — will auto-show the latest 3 published courses.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {selectedCourses.map((course, idx) => (
                  <li
                    key={course.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-card p-2"
                  >
                    <span className="flex-1 truncate text-sm">{course.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(idx, 1)}
                      disabled={idx === selectedCourses.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle(course.id)}
                      aria-label="Remove from featured"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {unselectedCourses.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Add more</Label>
              <ul className="mt-2 space-y-2">
                {unselectedCourses.map((course) => (
                  <li
                    key={course.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2"
                  >
                    <span className="flex-1 truncate text-sm text-muted-foreground">
                      {course.title}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggle(course.id)}
                    >
                      <Plus className="mr-1 size-3.5" />
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Testimonials ------------------------------------------------------------

function TestimonialsForm({
  config,
  courses,
  onChange,
}: {
  config: TestimonialsConfig;
  courses: PublishedCourseSummary[];
  onChange: (config: TestimonialsConfig) => void;
}) {
  function patchItem(idx: number, p: Partial<TestimonialsConfig["items"][number]>) {
    onChange({
      ...config,
      items: config.items.map((it, i) => (i === idx ? { ...it, ...p } : it)),
    });
  }
  function addItem() {
    onChange({
      ...config,
      items: [
        ...config.items,
        { quote: "", name: "", role: null, photo_url: null, course_id: null },
      ],
    });
  }
  function removeItem(idx: number) {
    if (config.items.length <= 1) return;
    onChange({ ...config, items: config.items.filter((_, i) => i !== idx) });
  }
  return (
    <div className="space-y-5">
      <Field label="Heading" hint="Defaults to “What students say”.">
        <Input
          value={config.heading ?? ""}
          onChange={(e) => onChange({ ...config, heading: e.target.value || null })}
          maxLength={255}
        />
      </Field>
      {config.items.map((item, idx) => (
        <div key={idx} className="space-y-3 rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Testimonial #{idx + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(idx)}
              disabled={config.items.length <= 1}
              aria-label="Remove testimonial"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Field label="Quote" required>
            <Textarea
              value={item.quote}
              onChange={(e) => patchItem(idx, { quote: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </Field>
          <Field label="Name" required>
            <Input
              value={item.name}
              onChange={(e) => patchItem(idx, { name: e.target.value })}
              maxLength={255}
            />
          </Field>
          <Field label="Role">
            <Input
              value={item.role ?? ""}
              onChange={(e) => patchItem(idx, { role: e.target.value || null })}
              maxLength={255}
              placeholder="e.g. Senior engineer at Acme"
            />
          </Field>
          <Field label="Photo URL">
            <Input
              value={item.photo_url ?? ""}
              onChange={(e) => patchItem(idx, { photo_url: e.target.value || null })}
              maxLength={2048}
              placeholder="https://…"
            />
          </Field>
          <Field label="Course" hint="Optional — associate the quote with a specific course.">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={item.course_id ?? ""}
              onChange={(e) => patchItem(idx, { course_id: e.target.value || null })}
            >
              <option value="">(none)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-2 size-4" />
        Add testimonial
      </Button>
    </div>
  );
}

// --- FAQs --------------------------------------------------------------------

function FaqsForm({
  config,
  onChange,
}: {
  config: FaqsConfig;
  onChange: (config: FaqsConfig) => void;
}) {
  function patchItem(idx: number, p: Partial<FaqsConfig["items"][number]>) {
    onChange({
      ...config,
      items: config.items.map((it, i) => (i === idx ? { ...it, ...p } : it)),
    });
  }
  function addItem() {
    onChange({
      ...config,
      items: [...config.items, { question: "", answer: "" }],
    });
  }
  function removeItem(idx: number) {
    if (config.items.length <= 1) return;
    onChange({ ...config, items: config.items.filter((_, i) => i !== idx) });
  }
  return (
    <div className="space-y-5">
      <Field label="Heading" hint="Defaults to “Frequently asked questions”.">
        <Input
          value={config.heading ?? ""}
          onChange={(e) => onChange({ ...config, heading: e.target.value || null })}
          maxLength={255}
        />
      </Field>
      {config.items.map((item, idx) => (
        <div key={idx} className="space-y-3 rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Question #{idx + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(idx)}
              disabled={config.items.length <= 1}
              aria-label="Remove question"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Field label="Question" required>
            <Input
              value={item.question}
              onChange={(e) => patchItem(idx, { question: e.target.value })}
              maxLength={255}
            />
          </Field>
          <Field label="Answer" required>
            <Textarea
              value={item.answer}
              onChange={(e) => patchItem(idx, { answer: e.target.value })}
              rows={4}
              maxLength={10000}
            />
          </Field>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-2 size-4" />
        Add question
      </Button>
    </div>
  );
}

// --- Field shell -------------------------------------------------------------

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
