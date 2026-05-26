import { describe, expect, it } from "vitest";

import { highlightCodeBlocks } from "@/lib/code-highlight";

describe("highlightCodeBlocks", () => {
  it("leaves non-code markup untouched", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    expect(highlightCodeBlocks(html)).toBe(html);
  });

  it("adds hljs class and highlights tokens for language-tagged blocks", () => {
    const input =
      '<pre><code class="language-python">def foo():\n    return 42</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="hljs language-python"');
    // lowlight should at minimum recognise `def` as a keyword and `42` as a number.
    expect(out).toMatch(/<span class="hljs-keyword">def<\/span>/);
    expect(out).toMatch(/<span class="hljs-number">42<\/span>/);
  });

  it("decodes HTML entities before highlighting", () => {
    // Tiptap emits `<` as &lt; inside <code>. The highlighter must decode
    // first, otherwise lowlight tokenises "&lt;" as a literal not as a comparison.
    const input =
      '<pre><code class="language-javascript">const ok = a &lt; b;</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="hljs language-javascript"');
    expect(out).toMatch(/<span class="hljs-keyword">const<\/span>/);
    // Decoded back to a single `<` in the highlighted output (re-escaped by hast).
    expect(out).toContain("&#x3C;");
  });

  it("falls back to autodetection when no language class is set", () => {
    const input = "<pre><code>def foo(): return 42</code></pre>";
    const out = highlightCodeBlocks(input);
    // Autodetected — at least the hljs class is applied.
    expect(out).toMatch(/class="hljs"/);
  });

  it("handles unknown languages by autodetecting (and preserves the class)", () => {
    const input =
      '<pre><code class="language-zaphod">def foo():\n    return 42</code></pre>';
    const out = highlightCodeBlocks(input);
    // We keep the creator's language class for round-trip / styling hooks even
    // when lowlight can't tokenise it; autodetection still applies highlighting.
    expect(out).toContain("language-zaphod");
    expect(out).toMatch(/class="hljs language-zaphod"/);
    expect(out).toMatch(/<span class="hljs-/);
  });

  it("highlights multiple code blocks in one document independently", () => {
    const input =
      '<p>First</p>' +
      '<pre><code class="language-python">print(1)</code></pre>' +
      '<p>Second</p>' +
      '<pre><code class="language-javascript">console.log(2)</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain("language-python");
    expect(out).toContain("language-javascript");
    expect((out.match(/<span class="hljs-/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("matches tiptap-generated output that puts hljs class on <pre>", () => {
    // Real output from generateHTML(): HTMLAttributes config lands on <pre>.
    const input =
      '<pre class="hljs"><code class="language-python">def foo(): return 42</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toMatch(/<span class="hljs-keyword">def<\/span>/);
    expect(out).toMatch(/<span class="hljs-number">42<\/span>/);
  });

  it("preserves surrounding markup", () => {
    const input =
      '<h2>Example</h2><pre><code class="language-python">x = 1</code></pre><p>Done.</p>';
    const out = highlightCodeBlocks(input);
    expect(out.startsWith("<h2>Example</h2>")).toBe(true);
    expect(out.endsWith("<p>Done.</p>")).toBe(true);
  });

  it("emits a filename header chip with file icon when data-filename is present", () => {
    const input =
      '<pre class="hljs" data-filename="app.py"><code class="language-python">x = 1</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="code-block-header"');
    expect(out).toContain('<span class="code-block-filename">app.py</span>');
    expect(out).toContain('class="code-block-header-icon"');
    // Header sits before the pre — visual stacking with no rounded gap.
    expect(out.indexOf("code-block-header")).toBeLessThan(out.indexOf("<pre>"));
  });

  it("omits the header chip when no filename is set", () => {
    const input = '<pre class="hljs"><code class="language-python">x = 1</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).not.toContain("code-block-header");
  });

  it("escapes HTML-sensitive characters in the filename", () => {
    const input =
      '<pre class="hljs" data-filename="&lt;evil&gt;.py"><code class="language-python">x</code></pre>';
    const out = highlightCodeBlocks(input);
    // Decoded then re-escaped — no raw <evil> in the output.
    expect(out).toContain("&lt;evil&gt;.py");
    expect(out).not.toContain("<evil>.py");
  });

  it("wraps each block in a copy-button wrapper", () => {
    const input = '<pre><code class="language-python">x = 1</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="code-block-wrapper"');
    expect(out).toContain("data-copy-code");
    expect(out).toContain("aria-label=\"Copy code\"");
    // pre comes before the button in DOM order — CSS positions the button
    // absolutely; this keeps the code itself first for screen readers.
    const preIdx = out.indexOf("<pre>");
    const btnIdx = out.indexOf("<button");
    expect(preIdx).toBeGreaterThan(-1);
    expect(btnIdx).toBeGreaterThan(preIdx);
  });
});
