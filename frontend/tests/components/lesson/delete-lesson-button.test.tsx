import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteLessonButton } from "@/components/lesson/delete-lesson-button";

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

function renderButton() {
  return render(
    <DeleteLessonButton
      orgSlug="demo"
      courseSlug="intro-fastapi"
      sectionSlug="getting-started"
      lessonSlug="install-python"
      lessonTitle="Install Python"
    />,
  );
}

describe("DeleteLessonButton", () => {
  it("only shows the trigger button until clicked", () => {
    renderButton();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("opens an alert dialog naming the lesson when Delete is clicked", async () => {
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/delete this lesson/i);
    expect(dialog).toHaveTextContent(/install python/i);
    expect(dialog).toHaveTextContent(/can't be undone/i);
  });

  it("closes the dialog on Cancel without calling fetch", async () => {
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fires DELETE with X-Tenant-Slug header and navigates on success", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: /delete lesson/i }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "/api/v1/courses/intro-fastapi/sections/getting-started/lessons/install-python",
    );
    expect(init.method).toBe("DELETE");
    expect(init.headers).toEqual({ "X-Tenant-Slug": "demo" });
    expect(pushMock).toHaveBeenCalledWith(
      "/admin/courses/intro-fastapi/sections/getting-started",
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows error inside the dialog on 403 and keeps it open", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Forbidden" }, 403));
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: /delete lesson/i }));

    expect(
      await screen.findByText(/only owners and instructors can delete lessons/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
