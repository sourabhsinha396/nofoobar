import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonForm } from "@/components/lesson/lesson-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// Stub the TipTap-based ArticleEditor with a simple div that exposes its props
// via data attributes. Lets us verify the form passes the initial JSON doc
// through and that it's submitted back unchanged, without dealing with the
// contenteditable mechanics that don't render reliably in jsdom.
vi.mock("@/components/lesson/article-editor", () => ({
  ArticleEditor: ({
    value,
    id,
  }: {
    value: unknown;
    onChange: (v: unknown) => void;
    orgSlug: string;
    id?: string;
  }) => (
    <div data-testid="article-editor" data-value={JSON.stringify(value)} id={id} />
  ),
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

const ARTICLE_BODY = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "FastAPI is built on asyncio." }],
    },
  ],
};

const ARTICLE_INITIAL = {
  slug: "intro",
  title: "Why async matters",
  content_type: "article" as const,
  content: { body: ARTICLE_BODY },
  visibility: "draft" as const,
  duration_seconds: null,
  is_free_preview: false,
};

const VIDEO_INITIAL = {
  slug: "install",
  title: "Install Python",
  content_type: "video" as const,
  content: { url: "https://youtu.be/abc123" },
  visibility: "draft" as const,
  duration_seconds: 240,
  is_free_preview: false,
};

const LAB_EMBED_URL = "https://algoholia.com/fastapi/embed/00d65b72-b92b-4320-95d2-20d8b90b0f59";

const LAB_INITIAL = {
  slug: "http-lab",
  title: "HTTP methods lab",
  content_type: "lab" as const,
  content: { embed_url: LAB_EMBED_URL },
  visibility: "draft" as const,
  duration_seconds: null,
  is_free_preview: false,
};

function renderCreate() {
  return render(
    <LessonForm
      mode="create"
      orgSlug="demo"
      courseSlug="intro-fastapi"
      sectionSlug="getting-started"
      sectionTitle="Getting started"
    />,
  );
}

function renderEdit(
  initial: typeof ARTICLE_INITIAL | typeof VIDEO_INITIAL | typeof LAB_INITIAL,
) {
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

describe("LessonForm â€” edit mode", () => {
  it("pre-populates fields from initial values (article)", () => {
    renderEdit(ARTICLE_INITIAL);
    expect(screen.getByLabelText("Title")).toHaveValue("Why async matters");
    expect(screen.getByLabelText("Slug")).toHaveValue("intro");
    // ArticleEditor is mocked; check it received the initial TipTap doc.
    const editor = screen.getByTestId("article-editor");
    expect(JSON.parse(editor.dataset.value ?? "null")).toEqual(ARTICLE_BODY);
  });

  it("pre-populates fields from initial values (video)", () => {
    renderEdit(VIDEO_INITIAL);
    expect(screen.getByLabelText("Video URL")).toHaveValue("https://youtu.be/abc123");
    // 240 seconds â†’ 4 minutes in the input.
    expect(screen.getByLabelText(/Duration/)).toHaveValue(4);
  });

  it("disables content_type radios so users can't switch types", () => {
    renderEdit(ARTICLE_INITIAL);
    // Scope to the content-type radio group only â€” the form also has a
    // separate visibility radio group that's editable.
    const radios = screen.getAllByRole("radio", { name: /article|video/i });
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio).toBeDisabled();
    }
    const articleRadio = radios.find((r) => (r as HTMLInputElement).value === "article");
    expect(articleRadio).toBeChecked();
  });

  it("submits a PATCH with the full lesson payload (content + top-level fields)", async () => {
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
      "/api/v1/courses/intro-fastapi/sections/getting-started/lessons/intro",
    );
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      slug: "intro",
      title: "New title",
      content: { content_type: "article", body: ARTICLE_BODY },
      visibility: "draft",
      duration_seconds: null,
      is_free_preview: false,
    });
    expect(init.headers).toMatchObject({ "X-Tenant-Slug": "demo" });
  });

  it("sends duration_seconds at the top level (not nested in video content)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", slug: "install" }));
    renderEdit(VIDEO_INITIAL);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // duration_seconds lives at the top of the payload now â€” content is just url.
    expect(body.duration_seconds).toBe(240);
    expect(body.content).toEqual({
      content_type: "video",
      url: "https://youtu.be/abc123",
    });
    expect(body.content.duration_seconds).toBeUndefined();
  });

  it("clears duration on submit when the input is emptied", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", slug: "install" }));
    renderEdit(VIDEO_INITIAL);

    const user = userEvent.setup();
    const durationInput = screen.getByLabelText(/Duration/);
    await user.clear(durationInput);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.duration_seconds).toBeNull();
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

  it("pre-populates fields from initial values (lab)", () => {
    renderEdit(LAB_INITIAL);
    expect(screen.getByLabelText("Lab embed URL")).toHaveValue(LAB_EMBED_URL);
  });

  it("navigates to the new slug after successful PATCH", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", slug: "renamed" }));
    renderEdit(ARTICLE_INITIAL);

    const user = userEvent.setup();
    const slugInput = screen.getByLabelText("Slug");
    await user.clear(slugInput);
    await user.type(slugInput, "renamed");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(pushMock).toHaveBeenCalledWith(
      "/admin/courses/intro-fastapi/sections/getting-started/lessons/renamed",
    );
  });
});

describe("LessonForm — lab lessons (create mode)", () => {
  async function fillLabBasics(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("radio", { name: /lab/i }));
    await user.type(screen.getByLabelText("Title"), "HTTP methods lab");
    await user.type(screen.getByLabelText("Slug"), "http-lab");
  }

  it("submits a POST with lab content", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1", slug: "http-lab" }, 201));
    renderCreate();

    const user = userEvent.setup();
    await fillLabBasics(user);
    await user.click(screen.getByLabelText("Lab embed URL"));
    await user.paste(LAB_EMBED_URL);
    await user.click(screen.getByRole("button", { name: /create lesson/i }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/courses/intro-fastapi/sections/getting-started/lessons");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.content).toEqual({ content_type: "lab", embed_url: LAB_EMBED_URL });
  });

  it("extracts the URL from a pasted iframe snippet", async () => {
    renderCreate();

    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /lab/i }));
    const input = screen.getByLabelText("Lab embed URL");
    await user.click(input);
    await user.paste(
      `<iframe src="${LAB_EMBED_URL}" width="100%" height="600" frameborder="0" allow="clipboard-write"></iframe>`,
    );

    expect(input).toHaveValue(LAB_EMBED_URL);
  });

  it("rejects embed URLs that are not on the labs domain", async () => {
    renderCreate();

    const user = userEvent.setup();
    await fillLabBasics(user);
    await user.click(screen.getByLabelText("Lab embed URL"));
    await user.paste("https://evil.example.com/embed/x");
    await user.click(screen.getByRole("button", { name: /create lesson/i }));

    expect(await screen.findByText(/https link on algoholia\.com/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
