import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminUserMenu } from "@/components/layout/admin-user-menu";

const logoutMock = vi.fn();

vi.mock("@/lib/auth-actions", () => ({
  logout: () => logoutMock(),
}));

beforeEach(() => {
  logoutMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminUserMenu", () => {
  it("renders an admin account-menu trigger button", () => {
    render(<AdminUserMenu userName="Sourabh" userEmail="s@example.com" />);
    expect(screen.getByRole("button", { name: /admin account menu/i })).toBeInTheDocument();
  });

  it("shows the user details and a My account link to /me when opened", async () => {
    render(<AdminUserMenu userName="Sourabh" userEmail="s@example.com" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /admin account menu/i }));

    expect(await screen.findByText("Sourabh")).toBeInTheDocument();
    expect(screen.getByText("s@example.com")).toBeInTheDocument();

    const myAccountLink = screen.getByRole("menuitem", { name: /my account/i });
    expect(myAccountLink).toHaveAttribute("href", "/me");
  });

  it("invokes the logout action when Log out is selected", async () => {
    render(<AdminUserMenu userName="Sourabh" userEmail="s@example.com" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /admin account menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /log out/i }));

    expect(logoutMock).toHaveBeenCalledOnce();
  });
});
