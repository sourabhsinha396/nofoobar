import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SortableLessonList } from "@/components/sortable-lesson-list";
import type { Lesson } from "@/lib/tenant";

const LESSONS: Lesson[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    org_id: "org-1",
    course_id: "course-1",
    section_id: "section-1",
    slug: "welcome",
    title: "Welcome",
    content_type: "article",
    content: { body: "FastAPI is a modern web framework for building APIs with Python." },
    position: 0,
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    org_id: "org-1",
    course_id: "course-1",
    section_id: "section-1",
    slug: "install-python",
    title: "Install Python",
    content_type: "video",
    content: { url: "https://youtu.be/abc123" },
    position: 1,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    org_id: "org-1",
    course_id: "course-1",
    section_id: "section-1",
    slug: "first-app-quiz",
    title: "Knowledge check",
    content_type: "quiz",
    content: { questions: [{}, {}, {}] },
    position: 2,
  },
];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderList() {
  return render(
    <SortableLessonList
      orgSlug="demo"
      courseSlug="intro-fastapi"
      sectionSlug="getting-started"
      lessonsPrefix="/admin/courses/intro-fastapi/sections/getting-started/lessons"
      initialLessons={LESSONS}
    />,
  );
}

describe("SortableLessonList — smoke", () => {
  it("renders every lesson in the initial order", () => {
    renderList();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Welcome")).toBeInTheDocument();
    expect(within(items[1]).getByText("Install Python")).toBeInTheDocument();
    expect(within(items[2]).getByText("Knowledge check")).toBeInTheDocument();
  });

  it("renders an accessible drag handle for every lesson", () => {
    renderList();
    expect(
      screen.getByRole("button", { name: /drag to reorder lesson welcome/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /drag to reorder lesson install python/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /drag to reorder lesson knowledge check/i }),
    ).toBeInTheDocument();
  });

  it("renders a working detail link for every lesson", () => {
    renderList();
    expect(screen.getByRole("link", { name: /welcome/i })).toHaveAttribute(
      "href",
      "/admin/courses/intro-fastapi/sections/getting-started/lessons/welcome",
    );
    expect(screen.getByRole("link", { name: /install python/i })).toHaveAttribute(
      "href",
      "/admin/courses/intro-fastapi/sections/getting-started/lessons/install-python",
    );
    expect(screen.getByRole("link", { name: /knowledge check/i })).toHaveAttribute(
      "href",
      "/admin/courses/intro-fastapi/sections/getting-started/lessons/first-app-quiz",
    );
  });

  it("renders the content-type badge for each lesson", () => {
    renderList();
    expect(screen.getByText("Article")).toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("Quiz")).toBeInTheDocument();
  });

  it("shows a content-aware preview", () => {
    renderList();
    // Article preview: first ~120 chars of the body
    expect(
      screen.getByText(/fastapi is a modern web framework/i),
    ).toBeInTheDocument();
    // Video preview: the URL
    expect(screen.getByText("https://youtu.be/abc123")).toBeInTheDocument();
    // Quiz preview: question count
    expect(screen.getByText("3 questions")).toBeInTheDocument();
  });

  it("does not fire any fetch on initial mount", () => {
    renderList();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
