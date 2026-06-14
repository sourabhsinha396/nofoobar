import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EnrollButton } from "@/components/enrollment/enroll-button";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function renderButton(overrides: Partial<React.ComponentProps<typeof EnrollButton>> = {}) {
  return render(
    <EnrollButton orgSlug="demo" courseSlug="intro-fastapi" priceLabel="$99.00" {...overrides} />,
  );
}

describe("EnrollButton", () => {
  it("renders a Buy button labelled with the price", () => {
    renderButton();
    expect(screen.getByRole("button", { name: /buy for \$99\.00/i })).toBeInTheDocument();
  });

  it("navigates to the checkout page on click", async () => {
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /buy for \$99\.00/i }));

    expect(pushMock).toHaveBeenCalledOnce();
    expect(pushMock.mock.calls[0][0]).toContain("/courses/intro-fastapi/checkout");
  });
});
