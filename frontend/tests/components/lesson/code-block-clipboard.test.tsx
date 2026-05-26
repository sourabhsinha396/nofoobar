import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  copyToClipboard,
  extractCodeText,
  handleCopyClick,
} from "@/components/lesson/code-block-clipboard";

// Build the DOM the post-processor would produce so tests exercise the real
// selectors (.code-block-wrapper > pre + button[data-copy-code]).
function buildBlock(code: string): { btn: HTMLButtonElement; pre: HTMLPreElement } {
  const wrapper = document.createElement("div");
  wrapper.className = "code-block-wrapper";
  wrapper.innerHTML =
    `<pre><code class="hljs language-python">${code}</code></pre>` +
    '<button type="button" class="code-copy" data-copy-code aria-label="Copy code">' +
    '<span class="code-copy-label">Copy</span>' +
    "</button>";
  document.body.appendChild(wrapper);
  return {
    btn: wrapper.querySelector<HTMLButtonElement>("[data-copy-code]")!,
    pre: wrapper.querySelector<HTMLPreElement>("pre")!,
  };
}

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.body.innerHTML = "";
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  document.addEventListener("click", handleCopyClick);
});

afterEach(() => {
  document.removeEventListener("click", handleCopyClick);
  vi.useRealTimers();
});

describe("copyToClipboard", () => {
  it("writes through navigator.clipboard.writeText when available", async () => {
    await copyToClipboard("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
  });
});

describe("extractCodeText", () => {
  it("joins .line span text with newlines (matches the renderer's line wrapping)", () => {
    const code = document.createElement("code");
    code.innerHTML =
      '<span class="line">a = 1</span>' +
      '<span class="line">b = 2</span>' +
      '<span class="line">c = 3</span>';
    expect(extractCodeText(code)).toBe("a = 1\nb = 2\nc = 3");
  });

  it("falls back to textContent when there are no .line spans", () => {
    const code = document.createElement("code");
    code.textContent = "legacy text without line wrappers";
    expect(extractCodeText(code)).toBe("legacy text without line wrappers");
  });

  it("ignores .line elements nested inside other line spans (uses direct children only)", () => {
    const code = document.createElement("code");
    code.innerHTML =
      '<span class="line">outer<span class="line">inner</span></span>' +
      '<span class="line">next</span>';
    // Outer .line owns both "outer" and "inner" as its text content; we don't
    // want to count "inner" twice.
    expect(extractCodeText(code)).toBe("outerinner\nnext");
  });
});

describe("handleCopyClick", () => {
  it("copies the sibling code's textContent on click", async () => {
    const { btn } = buildBlock("x = 42");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // The handler kicks off an async chain — wait one microtask for the
    // synchronous writeText() call inside copyToClipboard.
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("x = 42");
  });

  it("flips the button to a 'copied' state after a successful copy", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { btn } = buildBlock("hello = 1");

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(btn.classList.contains("code-copy-copied")).toBe(true);
    });

    vi.advanceTimersByTime(1500);
    expect(btn.classList.contains("code-copy-copied")).toBe(false);
  });

  it("flips to an 'error' state when clipboard write rejects", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    const { btn } = buildBlock("oops");

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(btn.classList.contains("code-copy-error")).toBe(true);
    });
  });

  it("ignores clicks outside copy buttons", async () => {
    const { pre } = buildBlock("noop");
    pre.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await Promise.resolve();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("safely no-ops when the wrapper is missing", async () => {
    const lonely = document.createElement("button");
    lonely.setAttribute("data-copy-code", "");
    document.body.appendChild(lonely);

    expect(() => {
      lonely.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }).not.toThrow();
    expect(writeText).not.toHaveBeenCalled();
  });
});
