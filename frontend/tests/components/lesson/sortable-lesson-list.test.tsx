import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SortableLessonList } from "@/components/lesson/sortable-lesson-list";
import type { Lesson } from "@/lib/tenant";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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
    visibility: "draft",
    duration_seconds: null,
    is_free_preview: false,
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
    visibility: "draft",
    duration_seconds: null,
    is_free_preview: false,
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
    visibility: "draft",
    duration_seconds: null,
    is_free_preview: false,
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

describe("SortableLessonList — visibility toggle", () => {
  it("renders a switch with the current visibility label for each lesson", () => {
    renderList();
    // All seeded lessons are draft (see LESSONS at top); each row has a switch
    // with an aria-label that includes the current state.
    const switches = screen.getAllByRole("switch", {
      name: /lesson visibility, currently draft/i,
    });
    expect(switches).toHaveLength(3);
    expect(
      screen.queryByRole("switch", { name: /currently published/i }),
    ).toBeNull();
  });

  it("PATCHes visibility to 'published' when a draft switch is toggled on", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "x", slug: "welcome" }));
    renderList();

    const user = userEvent.setup();
    const welcomeRow = screen.getAllByRole("listitem")[0];
    const toggle = within(welcomeRow).getByRole("switch", {
      name: /currently draft/i,
    });
    await user.click(toggle);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:8000/api/v1/courses/intro-fastapi/sections/getting-started/lessons/welcome",
    );
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ visibility: "published" });
    expect(init.headers).toMatchObject({ "X-Tenant-Slug": "demo" });

    // Optimistic update: aria-label flips to "currently published".
    await waitFor(() => {
      expect(
        within(welcomeRow).getByRole("switch", { name: /currently published/i }),
      ).toBeInTheDocument();
    });
  });

  it("reverts the switch on PATCH failure and surfaces an error message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Forbidden" }, 403));
    renderList();

    const user = userEvent.setup();
    const welcomeRow = screen.getAllByRole("listitem")[0];
    const toggle = within(welcomeRow).getByRole("switch", {
      name: /currently draft/i,
    });
    await user.click(toggle);

    expect(
      await screen.findByText(/only owners and instructors/i),
    ).toBeInTheDocument();
    // Switch label flips back to draft.
    expect(
      within(welcomeRow).getByRole("switch", { name: /currently draft/i }),
    ).toBeInTheDocument();
  });
});
