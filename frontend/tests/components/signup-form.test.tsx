import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignupForm } from "@/components/signup-form";

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

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/name/i), "Ada");
  await user.type(screen.getByLabelText(/email/i), "ada@example.com");
  await user.type(screen.getByLabelText(/password/i), "hunter22");
  await user.click(screen.getByRole("button", { name: /sign up/i }));
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SignupForm", () => {
  it("defaults to /me when redirectTo prop is omitted", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "u1", email: "ada@example.com", name: "Ada" }));
    render(<SignupForm />);
    await fillAndSubmit();
    expect(pushMock).toHaveBeenCalledWith("/me");
  });

  it("honors a custom redirectTo prop", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "u1", email: "ada@example.com", name: "Ada" }));
    render(<SignupForm redirectTo="/courses" />);
    await fillAndSubmit();
    expect(pushMock).toHaveBeenCalledWith("/courses");
  });

  it("does not push on failed signup", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Email already exists" }, 409));
    render(<SignupForm redirectTo="/courses" />);
    await fillAndSubmit();
    expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
