import { describe, expect, it } from "vitest";

import { labEmbedSrc, parseLabEmbed } from "@/lib/tiptap-lab-embed";

const EMBED_ID = "489159ad-a71c-4187-9d9b-9b043782b834";

describe("parseLabEmbed", () => {
  it("extracts org + embedId from a full iframe snippet", () => {
    const code = `<iframe src="https://algoholia.com/fastapi/embed/${EMBED_ID}" width="100%" height="600" frameborder="0" allow="clipboard-write"></iframe>`;
    expect(parseLabEmbed(code)).toEqual({ org: "fastapi", embedId: EMBED_ID });
  });

  it("extracts from a bare embed URL", () => {
    expect(parseLabEmbed(`https://algoholia.com/fastapi/embed/${EMBED_ID}`)).toEqual({
      org: "fastapi",
      embedId: EMBED_ID,
    });
  });

  it("accepts single-quoted iframe src", () => {
    const code = `<iframe src='https://algoholia.com/django/embed/${EMBED_ID}'></iframe>`;
    expect(parseLabEmbed(code)).toEqual({ org: "django", embedId: EMBED_ID });
  });

  it("accepts subdomains of algoholia.com", () => {
    expect(parseLabEmbed(`https://labs.algoholia.com/fastapi/embed/${EMBED_ID}`)).toEqual({
      org: "fastapi",
      embedId: EMBED_ID,
    });
  });

  it("lowercases the org and embedId", () => {
    expect(parseLabEmbed(`https://algoholia.com/FastAPI/embed/${EMBED_ID.toUpperCase()}`)).toEqual({
      org: "fastapi",
      embedId: EMBED_ID,
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseLabEmbed(`   https://algoholia.com/fastapi/embed/${EMBED_ID}   `)).toEqual({
      org: "fastapi",
      embedId: EMBED_ID,
    });
  });

  it("rejects non-algoholia hosts (arbitrary-embed guard)", () => {
    expect(parseLabEmbed(`<iframe src="https://evil.com/fastapi/embed/${EMBED_ID}"></iframe>`)).toBeNull();
    expect(parseLabEmbed(`https://algoholia.com.evil.com/fastapi/embed/${EMBED_ID}`)).toBeNull();
  });

  it("rejects a malformed embed id", () => {
    expect(parseLabEmbed("https://algoholia.com/fastapi/embed/not-a-uuid")).toBeNull();
  });

  it("rejects the wrong path shape", () => {
    expect(parseLabEmbed(`https://algoholia.com/fastapi/${EMBED_ID}`)).toBeNull();
    expect(parseLabEmbed(`https://algoholia.com/embed/${EMBED_ID}`)).toBeNull();
    expect(parseLabEmbed(`https://algoholia.com/fastapi/preview/${EMBED_ID}`)).toBeNull();
  });

  it("returns null for empty or non-URL input", () => {
    expect(parseLabEmbed("")).toBeNull();
    expect(parseLabEmbed("   ")).toBeNull();
    expect(parseLabEmbed("not a url at all")).toBeNull();
  });
});

describe("labEmbedSrc", () => {
  it("builds the canonical embed URL", () => {
    expect(labEmbedSrc("fastapi", EMBED_ID)).toBe(
      `https://algoholia.com/fastapi/embed/${EMBED_ID}`,
    );
  });
});
