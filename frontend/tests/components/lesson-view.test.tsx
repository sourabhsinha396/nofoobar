import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LessonView } from "@/components/lesson-view";
import type { PublishedCourseLanding } from "@/lib/tenant";

const COURSE: PublishedCourseLanding = {
  id: "course-1",
  slug: "intro",
  title: "Intro to FastAPI",
  description: null,
  price_cents: null,
  currency: "USD",
  logo_url: null,
  level: "beginner",
  tags: [],
  sections: [
    {
      id: "sec-1",
      slug: "getting-started",
      title: "Getting started",
      description: null,
      position: 0,
      lessons: [
        {
          id: "l-1",
          slug: "welcome",
          title: "Welcome",
          content_type: "article",
          position: 0,
        },
      ],
    },
  ],
};

function renderView() {
  return render(
    <LessonView
      course={COURSE}
      currentSectionSlug="getting-started"
      currentLessonSlug="welcome"
      lessonHrefPrefix="/courses/intro/sections"
    >
      <div data-testid="lesson-body">Lesson body content</div>
    </LessonView>,
  );
}

describe("LessonView", () => {
  it("renders the mobile menu trigger", () => {
    renderView();
    expect(screen.getByRole("button", { name: /open course menu/i })).toBeInTheDocument();
  });

  it("renders the course title in the mobile bar", () => {
    renderView();
    // Course title appears in the mobile header bar
    expect(screen.getByText("Intro to FastAPI")).toBeInTheDocument();
  });

  it("renders children inside both mobile and desktop trees", () => {
    renderView();
    // The component renders both layouts (CSS-hidden); children appear twice in DOM
    const bodies = screen.getAllByTestId("lesson-body");
    expect(bodies).toHaveLength(2);
  });

  it("renders the desktop sidebar with section + lesson links", () => {
    renderView();
    // Desktop sidebar is always in the DOM (CSS-hidden on mobile)
    expect(screen.getByText("Getting started")).toBeInTheDocument();
    const lessonLinks = screen.getAllByRole("link", { name: /welcome/i });
    // At least one link exists in the desktop sidebar
    expect(lessonLinks.length).toBeGreaterThanOrEqual(1);
    expect(lessonLinks[0]).toHaveAttribute(
      "href",
      "/courses/intro/sections/getting-started/lessons/welcome",
    );
  });

  it("opens the mobile sheet on menu click and reveals the sidebar inside", async () => {
    renderView();
    const user = userEvent.setup();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open course menu/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/curriculum/i);
    expect(dialog).toHaveTextContent("Getting started");
  });
});
