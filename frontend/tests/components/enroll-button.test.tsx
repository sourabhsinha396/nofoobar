import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EnrollButton } from "@/components/enroll-button";

const refreshMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock }),
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

function renderButton(
  overrides: Partial<React.ComponentProps<typeof EnrollButton>> = {},
) {
  return render(
    <EnrollButton
      orgSlug="demo"
      courseSlug="intro-fastapi"
      priceCents={null}
      currency="USD"
      priceLabel="Free"
      {...overrides}
    />,
  );
}

describe("EnrollButton", () => {
  it("renders an Enroll now button", () => {
    renderButton();
    expect(screen.getByRole("button", { name: /enroll now/i })).toBeInTheDocument();
  });

  it("POSTs to /enroll with the X-Tenant-Slug header and refreshes on success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "e1", course_id: "c1", user_id: "u1", org_id: "o1" }),
    );
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /enroll now/i }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/courses/intro-fastapi/enroll");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "X-Tenant-Slug": "demo" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("maps 401 to a sign-in error message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Not authenticated" }, 401));
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /enroll now/i }));

    expect(await screen.findByText(/please sign in to enroll/i)).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("maps 404 to a course-unavailable message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "No course with slug" }, 404));
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /enroll now/i }));

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows a generic message and re-enables the button on unexpected errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "boom" }, 500));
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /enroll now/i }));

    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enroll now/i })).not.toBeDisabled();
  });

  it("does not send a body or Content-Type header (POST with no payload)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "e1" }));
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /enroll now/i }));

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("for paid courses, navigates to the checkout page instead of POSTing", async () => {
    renderButton({ priceCents: 9900, currency: "USD", priceLabel: "$99.00" });
    expect(screen.getByRole("button", { name: /buy for \$99\.00/i })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /buy for \$99\.00/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledOnce();
    expect(pushMock.mock.calls[0][0]).toContain("/courses/intro-fastapi/checkout");
  });
});
