import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SortableSectionList } from "@/components/section/sortable-section-list";
import type { Section } from "@/lib/tenant";

const SECTIONS: Section[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    org_id: "org-1",
    course_id: "course-1",
    slug: "getting-started",
    title: "Getting started",
    description: "Set up your environment.",
    position: 0,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    org_id: "org-1",
    course_id: "course-1",
    slug: "first-app",
    title: "Your first app",
    description: null,
    position: 1,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    org_id: "org-1",
    course_id: "course-1",
    slug: "deployment",
    title: "Deployment",
    description: null,
    position: 2,
  },
];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderList() {
  return render(
    <SortableSectionList
      orgSlug="demo"
      courseSlug="intro-fastapi"
      sectionsPrefix="/admin/courses/intro-fastapi/sections"
      initialSections={SECTIONS}
    />,
  );
}

describe("SortableSectionList — smoke", () => {
  it("renders every section in the initial order", () => {
    renderList();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Getting started")).toBeInTheDocument();
    expect(within(items[1]).getByText("Your first app")).toBeInTheDocument();
    expect(within(items[2]).getByText("Deployment")).toBeInTheDocument();
  });

  it("renders an accessible drag handle for every section", () => {
    renderList();
    expect(
      screen.getByRole("button", { name: /drag to reorder section getting started/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /drag to reorder section your first app/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /drag to reorder section deployment/i }),
    ).toBeInTheDocument();
  });

  it("renders a working detail link for every section", () => {
    renderList();
    expect(screen.getByRole("link", { name: /getting started/i })).toHaveAttribute(
      "href",
      "/admin/courses/intro-fastapi/sections/getting-started",
    );
    expect(screen.getByRole("link", { name: /your first app/i })).toHaveAttribute(
      "href",
      "/admin/courses/intro-fastapi/sections/first-app",
    );
    expect(screen.getByRole("link", { name: /deployment/i })).toHaveAttribute(
      "href",
      "/admin/courses/intro-fastapi/sections/deployment",
    );
  });

  it("renders 1-indexed position numbers", () => {
    renderList();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renders the section description when present", () => {
    renderList();
    expect(screen.getByText("Set up your environment.")).toBeInTheDocument();
  });

  it("does not fire any fetch on initial mount", () => {
    renderList();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
