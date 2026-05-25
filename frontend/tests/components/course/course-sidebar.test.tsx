import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CourseSidebar } from "@/components/course/course-sidebar";
import type { PublishedCourseLanding } from "@/lib/tenant";

const FIXTURE: PublishedCourseLanding = {
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
        {
          id: "l-2",
          slug: "install-python",
          title: "Install Python",
          content_type: "video",
          position: 1,
        },
      ],
    },
    {
      id: "sec-2",
      slug: "first-app",
      title: "Your first app",
      description: null,
      position: 1,
      lessons: [
        {
          id: "l-3",
          slug: "hello-world",
          title: "Hello world",
          content_type: "lab",
          position: 0,
        },
      ],
    },
    {
      id: "sec-3",
      slug: "empty",
      title: "Empty section",
      description: null,
      position: 2,
      lessons: [],
    },
  ],
};

afterEach(() => {
  vi.clearAllMocks();
});

function renderSidebar(overrides: Partial<React.ComponentProps<typeof CourseSidebar>> = {}) {
  return render(
    <CourseSidebar
      course={FIXTURE}
      lessonHrefPrefix="/courses/intro/sections"
      currentSectionSlug="getting-started"
      currentLessonSlug="welcome"
      {...overrides}
    />,
  );
}

describe("CourseSidebar", () => {
  it("renders every section title", () => {
    renderSidebar();
    expect(screen.getByText("Getting started")).toBeInTheDocument();
    expect(screen.getByText("Your first app")).toBeInTheDocument();
    expect(screen.getByText("Empty section")).toBeInTheDocument();
  });

  it("renders every lesson with correct href", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /welcome/i })).toHaveAttribute(
      "href",
      "/courses/intro/sections/getting-started/lessons/welcome",
    );
    expect(screen.getByRole("link", { name: /install python/i })).toHaveAttribute(
      "href",
      "/courses/intro/sections/getting-started/lessons/install-python",
    );
    expect(screen.getByRole("link", { name: /hello world/i })).toHaveAttribute(
      "href",
      "/courses/intro/sections/first-app/lessons/hello-world",
    );
  });

  it("highlights the active lesson with the accent class", () => {
    renderSidebar({ currentSectionSlug: "first-app", currentLessonSlug: "hello-world" });
    const activeLink = screen.getByRole("link", { name: /hello world/i });
    expect(activeLink.classList.contains("bg-accent")).toBe(true);
    expect(activeLink.classList.contains("font-medium")).toBe(true);

    const inactiveLink = screen.getByRole("link", { name: /welcome/i });
    expect(inactiveLink.classList.contains("bg-accent")).toBe(false);
    expect(inactiveLink.classList.contains("text-muted-foreground")).toBe(true);
  });

  it("treats the (section, lesson) pair as the identity for active highlighting", () => {
    // A lesson with the same slug in a different section must NOT be considered active.
    const cousin: PublishedCourseLanding = {
      ...FIXTURE,
      price_cents: null,
      currency: "USD",
      sections: [
        ...FIXTURE.sections,
        {
          id: "sec-extra",
          slug: "extra",
          title: "Extra",
          description: null,
          position: 3,
          lessons: [
            {
              id: "l-extra",
              slug: "welcome", // same slug as the active lesson
              title: "Welcome (extra)",
              content_type: "article",
              position: 0,
            },
          ],
        },
      ],
    };

    render(
      <CourseSidebar
        course={cousin}
        lessonHrefPrefix="/courses/intro/sections"
        currentSectionSlug="getting-started"
        currentLessonSlug="welcome"
      />,
    );

    const activeLink = screen.getByRole("link", { name: "Welcome" });
    const cousinLink = screen.getByRole("link", { name: "Welcome (extra)" });

    expect(activeLink.classList.contains("bg-accent")).toBe(true);
    expect(cousinLink.classList.contains("bg-accent")).toBe(false);
  });

  it("invokes onNavigate when a lesson link is clicked", async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: /hello world/i }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("does not crash and shows 'No lessons' for an empty section", () => {
    renderSidebar();
    expect(screen.getByText(/no lessons/i)).toBeInTheDocument();
  });
});
