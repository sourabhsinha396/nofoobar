"use client";

import { useEffect, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

// Mounts a single document-level click listener that handles any
// [data-copy-code] button (rendered by lib/code-highlight.ts). Document-level
// delegation keeps the listener trivially testable and avoids wrapping the
// article in an extra DOM node.
export function CodeBlockClipboard({ children }: Props) {
  useEffect(() => {
    document.addEventListener("click", handleCopyClick);
    return () => document.removeEventListener("click", handleCopyClick);
  }, []);

  return <>{children}</>;
}

// Exported for tests: drive it with any HTML containing [data-copy-code]
// inside a .code-block-wrapper.
export function handleCopyClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  const btn = target?.closest<HTMLButtonElement>("[data-copy-code]");
  if (!btn) return;
  const wrapper = btn.closest(".code-block-wrapper");
  const code = wrapper?.querySelector("pre code");
  if (!code) return;

  const text = extractCodeText(code);
  copyToClipboard(text)
    .then(() => flash(btn, "code-copy-copied"))
    .catch(() => flash(btn, "code-copy-error"));
}

// Each source line is wrapped in <span class="line"> with no \n separators
// (the line breaks come from CSS .line { display: block }). textContent on the
// whole <code> would concatenate everything with no newlines, so join the line
// spans explicitly. Falls back to textContent if there are no line spans
// (e.g. when older content predates the line-wrapping post-processor).
export function extractCodeText(code: Element): string {
  const lineEls = code.querySelectorAll(":scope > .line");
  if (lineEls.length === 0) return code.textContent ?? "";
  return Array.from(lineEls)
    .map((el) => el.textContent ?? "")
    .join("\n");
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for older browsers / non-secure contexts. textarea + execCommand
  // is deprecated but still works everywhere clipboard API isn't available.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

const FLASH_DURATION_MS = 1500;

function flash(btn: HTMLButtonElement, className: string): void {
  btn.classList.add(className);
  const existing = btn.dataset.flashTimeout;
  if (existing) window.clearTimeout(Number(existing));
  const timeout = window.setTimeout(() => {
    btn.classList.remove(className);
    delete btn.dataset.flashTimeout;
  }, FLASH_DURATION_MS);
  btn.dataset.flashTimeout = String(timeout);
}
