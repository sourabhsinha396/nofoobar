import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonContent } from "@/components/lesson/lesson-content";
import type { Lesson } from "@/lib/tenant";

function videoLesson(content: Record<string, unknown>): Lesson {
  return {
    id: "l-1",
    org_id: "o-1",
    course_id: "c-1",
    section_id: "s-1",
    slug: "intro-video",
    title: "Intro video",
    content_type: "video",
    content: { content_type: "video", ...content },
    position: 0,
  };
}

describe("LessonContent video branch", () => {
  it("renders a YouTube embed via the nocookie variant", () => {
    const lesson = videoLesson({ url: "https://www.youtube.com/watch?v=abc12345" });
    const { container } = render(<LessonContent lesson={lesson} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.src).toBe("https://www.youtube-nocookie.com/embed/abc12345");
    expect(container.querySelector("[data-youtube-video]")).not.toBeNull();
  });

  it("normalizes youtu.be short URLs", () => {
    const lesson = videoLesson({ url: "https://youtu.be/abc12345" });
    const { container } = render(<LessonContent lesson={lesson} />);
    const iframe = container.querySelector("iframe");
    expect(iframe?.src).toBe("https://www.youtube-nocookie.com/embed/abc12345");
  });

  it("renders a Vimeo player iframe with data-video-embed=vimeo", () => {
    const lesson = videoLesson({ url: "https://vimeo.com/76979871" });
    const { container } = render(<LessonContent lesson={lesson} />);
    const wrapper = container.querySelector("[data-video-embed='vimeo']");
    expect(wrapper).not.toBeNull();
    const iframe = wrapper?.querySelector("iframe");
    expect(iframe?.src).toBe("https://player.vimeo.com/video/76979871");
  });

  it("renders a Mux player iframe with data-video-embed=mux", () => {
    const lesson = videoLesson({ url: "https://player.mux.com/EVa02GuwVnMAiG8aSNFSTguHYMsJME7JxzuKeb02B00efQ" });
    const { container } = render(<LessonContent lesson={lesson} />);
    const wrapper = container.querySelector("[data-video-embed='mux']");
    expect(wrapper).not.toBeNull();
    const iframe = wrapper?.querySelector("iframe");
    expect(iframe?.src).toContain("/EVa02GuwVnMAiG8aSNFSTguHYMsJME7JxzuKeb02B00efQ");
  });

  it("renders an HTML5 <video> for direct .mp4 URLs", () => {
    const lesson = videoLesson({ url: "https://cdn.example.com/lessons/intro.mp4" });
    const { container } = render(<LessonContent lesson={lesson} />);
    const wrapper = container.querySelector("[data-video-embed='native']");
    expect(wrapper).not.toBeNull();
    const video = wrapper?.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("https://cdn.example.com/lessons/intro.mp4");
    expect(video?.hasAttribute("controls")).toBe(true);
  });

  it("falls back to a plain link card for unrecognized URLs", () => {
    const lesson = videoLesson({ url: "https://wistia.com/medias/abc" });
    render(<LessonContent lesson={lesson} />);
    const link = screen.getByRole("link", { name: /wistia\.com/i });
    expect(link).toHaveAttribute("href", "https://wistia.com/medias/abc");
  });

  it("handles missing/empty URL without crashing", () => {
    const lesson = videoLesson({});
    const { container } = render(<LessonContent lesson={lesson} />);
    // Empty URL → unrecognized → fallback card with an empty href
    expect(container.textContent).toContain("Video URL");
  });
});
