// Pure helpers for code-block line highlighting. Kept out of the React /
// ProseMirror layers so they can be unit-tested without a live editor.

// Given a code block's text content and a character offset within it, return
// the 1-indexed line number that offset sits on. Offsets past the end clamp
// to the last line. A single trailing newline doesn't introduce a new line -
// matches wrapLines() in lib/code-highlight.ts which drops the trailing empty
// line so creators and learners agree on what "line N" means.
export function lineNumberAtOffset(text: string, offset: number): number {
  const effective = text.endsWith("\n") ? text.slice(0, -1) : text;
  let line = 1;
  const limit = Math.min(Math.max(offset, 0), effective.length);
  for (let i = 0; i < limit; i++) {
    if (effective[i] === "\n") line++;
  }
  return line;
}

// Toggle a 1-indexed line in/out of a sorted, deduplicated list. Returns a new
// array; never mutates the input. Skips zero/negative line numbers as a guard.
export function toggleLine(lines: readonly number[], line: number): number[] {
  if (line < 1) return [...lines];
  const set = new Set(lines.filter((n) => n > 0));
  if (set.has(line)) set.delete(line);
  else set.add(line);
  return Array.from(set).sort((a, b) => a - b);
}

// Toggle every line covered by a range in/out of the list. If ANY of the
// targeted lines are currently highlighted, the toggle removes them all;
// otherwise it adds them all. Mirrors what a "Highlight selection" toolbar
// button feels like - repeated clicks cleanly add then remove.
export function toggleLineRange(
  lines: readonly number[],
  fromLine: number,
  toLine: number,
): number[] {
  const start = Math.max(1, Math.min(fromLine, toLine));
  const end = Math.max(fromLine, toLine);
  if (end < 1) return [...lines];
  const set = new Set(lines.filter((n) => n > 0));
  const targets: number[] = [];
  for (let l = start; l <= end; l++) targets.push(l);
  const anyOn = targets.some((l) => set.has(l));
  for (const l of targets) {
    if (anyOn) set.delete(l);
    else set.add(l);
  }
  return Array.from(set).sort((a, b) => a - b);
}

// Compute the 1-indexed line range a ProseMirror selection covers inside a
// code block, given the block's text content and the selection offsets
// (relative to the block's text start, i.e. cursor positions translated into
// in-block offsets). Returns null if the offsets are nonsensical (negative).
export function lineRangeForOffsets(
  text: string,
  fromOffset: number,
  toOffset: number,
): { fromLine: number; toLine: number } | null {
  if (fromOffset < 0 || toOffset < 0) return null;
  const lo = Math.min(fromOffset, toOffset);
  const hi = Math.max(fromOffset, toOffset);
  return {
    fromLine: lineNumberAtOffset(text, lo),
    toLine: lineNumberAtOffset(text, hi),
  };
}
