import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonForm } from "@/components/lesson-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const ARTICLE_INITIAL = {
  slug: "intro",
  title: "Why async matters",
  content_type: "article" as const,
  content: { body: "FastAPI is built on asyncio." },
};

const VIDEO_INITIAL = {
  slug: "install",
  title: "Install Python",
  content_type: "video" as const,
  content: { url: "https://youtu.be/abc123", duration_seconds: 240 },
};

function renderEdit(initial: typeof ARTICLE_INITIAL | typeof VIDEO_INITIAL) {
  return render(
    <LessonForm
      mode="edit"
      orgSlug="demo"
      courseSlug="intro-fastapi"
      sectionSlug="getting-started"
      lessonSlug={initial.slug}
      initial={initial}
    />,
  );
}

describe("LessonForm — edit mode", () => {
  it("pre-populates fields from initial values (article)", () => {
    renderEdit(ARTICLE_INITIAL);
    expect(screen.getByLabelText("Title")).toHaveValue("Why async matters");
    expect(screen.getByLabelText("Slug")).toHaveValue("intro");
    expect(screen.getByLabelText(/Body/)).toHaveValue("FastAPI is built on asyncio.");
  });

  it("pre-populates fields from initial values (video)", () => {
    renderEdit(VIDEO_INITIAL);
    expect(screen.getByLabelText("Video URL")).toHaveValue("https://youtu.be/abc123");
    expect(screen.getByLabelText(/Duration/)).toHaveValue(240);
  });

  it("disables content_type radios so users can't switch types", () => {
    renderEdit(ARTICLE_INITIAL);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio).toBeDisabled();
    }
    // The article radio is the one that's checked
    const articleRadio = radios.find((r) => (r as HTMLInputElement).value === "article");
    expect(articleRadio).toBeChecked();
  });

  it("submits a PATCH with article-shaped content payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", slug: "intro" }));
    renderEdit(ARTICLE_INITIAL);

    const user = userEvent.setup();
    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "New title");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:8000/api/v1/courses/intro-fastapi/sections/getting-started/lessons/intro",
    );
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      slug: "intro",
      title: "New title",
      content: { content_type: "article", body: "FastAPI is built on asyncio." },
    });
    expect(init.headers).toMatchObject({ "X-Tenant-Slug": "demo" });
  });

  it("submits a PATCH with video-shaped content payload (omits empty duration)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", slug: "install" }));
    renderEdit(VIDEO_INITIAL);

    const user = userEvent.setup();
    const durationInput = screen.getByLabelText(/Duration/);
    await user.clear(durationInput);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.content).toEqual({
      content_type: "video",
      url: "https://youtu.be/abc123",
    });
    expect(body.content.duration_seconds).toBeUndefined();
  });

  it("surfaces a 409 slug conflict to the user", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "Slug already used in this section" }, 409),
    );
    renderEdit(ARTICLE_INITIAL);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/already used/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("maps 403 to a role-gate message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Forbidden" }, 403));
    renderEdit(ARTICLE_INITIAL);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/only owners and instructors can edit lessons/i),
    ).toBeInTheDocument();
  });

  it("navigates to the new slug after successful PATCH", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", slug: "renamed" }));
    renderEdit(ARTICLE_INITIAL);

    const user = userEvent.setup();
    const slugInput = screen.getByLabelText("Slug");
    await user.clear(slugInput);
    await user.type(slugInput, "renamed");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // tenantPath returns the bare path in subdomain mode (default jsdom location)
    expect(pushMock).toHaveBeenCalledWith(
      "/admin/courses/intro-fastapi/sections/getting-started/lessons/renamed",
    );
  });
});
