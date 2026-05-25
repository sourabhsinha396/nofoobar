import { describe, expect, it } from "vitest";

import { detectVideoProvider } from "@/lib/tiptap-video-embed";

describe("detectVideoProvider", () => {
  it("detects standard YouTube watch URLs", () => {
    expect(detectVideoProvider("https://www.youtube.com/watch?v=o4B00GBybZg")).toEqual({
      provider: "youtube",
      src: "https://www.youtube.com/watch?v=o4B00GBybZg",
    });
  });

  it("detects youtu.be short URLs", () => {
    expect(detectVideoProvider("https://youtu.be/abc12345")).toEqual({
      provider: "youtube",
      src: "https://youtu.be/abc12345",
    });
  });

  it("detects youtube shorts", () => {
    expect(detectVideoProvider("https://www.youtube.com/shorts/o4B00GBybZg")).toEqual({
      provider: "youtube",
      src: "https://www.youtube.com/shorts/o4B00GBybZg",
    });
  });

  it("normalizes Vimeo URLs to the embed player", () => {
    expect(detectVideoProvider("https://vimeo.com/76979871")).toEqual({
      provider: "vimeo",
      src: "https://player.vimeo.com/video/76979871",
    });
  });

  it("normalizes Vimeo player URLs", () => {
    expect(detectVideoProvider("https://player.vimeo.com/video/76979871")).toEqual({
      provider: "vimeo",
      src: "https://player.vimeo.com/video/76979871",
    });
  });

  it("normalizes Loom share URLs to the embed form", () => {
    expect(
      detectVideoProvider("https://www.loom.com/share/abc123def4567890abcdef1234567890"),
    ).toEqual({
      provider: "loom",
      src: "https://www.loom.com/embed/abc123def4567890abcdef1234567890",
    });
  });

  it("accepts already-embed Loom URLs", () => {
    expect(
      detectVideoProvider("https://www.loom.com/embed/abc123def4567890abcdef1234567890"),
    ).toEqual({
      provider: "loom",
      src: "https://www.loom.com/embed/abc123def4567890abcdef1234567890",
    });
  });

  it("detects direct .mp4 URLs", () => {
    expect(detectVideoProvider("https://cdn.example.com/lessons/intro.mp4")).toEqual({
      provider: "native",
      src: "https://cdn.example.com/lessons/intro.mp4",
    });
  });

  it("detects .webm with query string", () => {
    expect(detectVideoProvider("https://cdn.example.com/v.webm?token=abc")).toEqual({
      provider: "native",
      src: "https://cdn.example.com/v.webm?token=abc",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(detectVideoProvider("  https://vimeo.com/12345  ")).toEqual({
      provider: "vimeo",
      src: "https://player.vimeo.com/video/12345",
    });
  });

  it("returns null for empty input", () => {
    expect(detectVideoProvider("")).toBeNull();
    expect(detectVideoProvider("   ")).toBeNull();
  });

  it("returns null for unsupported URLs", () => {
    expect(detectVideoProvider("https://example.com/cool-video")).toBeNull();
    expect(detectVideoProvider("https://wistia.com/medias/abc")).toBeNull();
    expect(detectVideoProvider("not a url at all")).toBeNull();
  });

  it("returns null for URLs with no video extension and no recognized host", () => {
    expect(detectVideoProvider("https://example.com/video")).toBeNull();
  });
});
