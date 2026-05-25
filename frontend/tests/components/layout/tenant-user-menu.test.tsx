import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TenantUserMenu } from "@/components/layout/tenant-user-menu";

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

describe("TenantUserMenu", () => {
  it("renders an account-menu trigger button", () => {
    render(<TenantUserMenu userName="Ada Lovelace" userEmail="ada@example.com" />);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
  });

  it("does not show user details before the dropdown is opened", () => {
    render(<TenantUserMenu userName="Ada Lovelace" userEmail="ada@example.com" />);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
  });

  it("opens the dropdown and shows the user name + email", async () => {
    render(<TenantUserMenu userName="Ada Lovelace" userEmail="ada@example.com" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /account menu/i }));

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("invokes the logout action when Log out is selected", async () => {
    render(<TenantUserMenu userName="Ada Lovelace" userEmail="ada@example.com" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /account menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /log out/i }));

    expect(logoutMock).toHaveBeenCalledOnce();
  });
});
