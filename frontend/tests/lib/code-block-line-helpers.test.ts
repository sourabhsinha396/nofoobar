import { describe, expect, it } from "vitest";

import {
  lineNumberAtOffset,
  lineRangeForOffsets,
  toggleLine,
  toggleLineRange,
} from "@/lib/code-block-line-helpers";

describe("lineNumberAtOffset", () => {
  it("returns 1 for offset 0 on any input", () => {
    expect(lineNumberAtOffset("", 0)).toBe(1);
    expect(lineNumberAtOffset("foo", 0)).toBe(1);
    expect(lineNumberAtOffset("a\nb\nc", 0)).toBe(1);
  });

  it("counts each newline as a line break", () => {
    const text = "a\nb\nc";
    // Positions: 0 'a', 1 '\n', 2 'b', 3 '\n', 4 'c'
    expect(lineNumberAtOffset(text, 0)).toBe(1); // before 'a'
    expect(lineNumberAtOffset(text, 1)).toBe(1); // before the first \n (still line 1)
    expect(lineNumberAtOffset(text, 2)).toBe(2); // after first \n, on 'b'
    expect(lineNumberAtOffset(text, 4)).toBe(3); // on 'c'
  });

  it("clamps offsets past the end to the last line", () => {
    expect(lineNumberAtOffset("a\nb", 999)).toBe(2);
    expect(lineNumberAtOffset("a\nb\n", 999)).toBe(2); // trailing newline doesn't count as new line
  });

  it("clamps negative offsets to line 1", () => {
    expect(lineNumberAtOffset("a\nb", -5)).toBe(1);
  });
});

describe("toggleLine", () => {
  it("adds a missing line", () => {
    expect(toggleLine([], 3)).toEqual([3]);
    expect(toggleLine([1, 5], 3)).toEqual([1, 3, 5]);
  });

  it("removes a present line", () => {
    expect(toggleLine([1, 3, 5], 3)).toEqual([1, 5]);
  });

  it("deduplicates and sorts", () => {
    expect(toggleLine([3, 1, 1, 5], 2)).toEqual([1, 2, 3, 5]);
  });

  it("ignores non-positive line numbers", () => {
    expect(toggleLine([1, 2], 0)).toEqual([1, 2]);
    expect(toggleLine([1, 2], -3)).toEqual([1, 2]);
  });

  it("never mutates the input array", () => {
    const input = [1, 2, 3];
    toggleLine(input, 2);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("toggleLineRange", () => {
  it("adds every line in the range when none are highlighted", () => {
    expect(toggleLineRange([], 2, 4)).toEqual([2, 3, 4]);
  });

  it("removes every line in the range when any are highlighted", () => {
    // Range [2,4]: line 3 is already highlighted, so the whole range gets removed.
    expect(toggleLineRange([3], 2, 4)).toEqual([]);
    expect(toggleLineRange([1, 3, 5], 2, 4)).toEqual([1, 5]);
  });

  it("treats reversed from/to the same as forward", () => {
    expect(toggleLineRange([], 4, 2)).toEqual([2, 3, 4]);
  });

  it("handles single-line ranges (cursor with no selection)", () => {
    expect(toggleLineRange([], 3, 3)).toEqual([3]);
    expect(toggleLineRange([3], 3, 3)).toEqual([]);
  });

  it("ignores zero/negative ranges defensively", () => {
    expect(toggleLineRange([1], 0, -1)).toEqual([1]);
  });
});

describe("lineRangeForOffsets", () => {
  it("returns the line numbers covered by a selection", () => {
    const text = "a\nb\nc\nd";
    // Selection from start of line 2 to mid line 3 → lines [2, 3]
    expect(lineRangeForOffsets(text, 2, 5)).toEqual({ fromLine: 2, toLine: 3 });
  });

  it("returns the same line when from === to (cursor)", () => {
    const text = "a\nb\nc";
    expect(lineRangeForOffsets(text, 2, 2)).toEqual({ fromLine: 2, toLine: 2 });
  });

  it("normalises reversed offsets", () => {
    const text = "a\nb\nc";
    expect(lineRangeForOffsets(text, 4, 0)).toEqual({ fromLine: 1, toLine: 3 });
  });

  it("returns null when either offset is negative", () => {
    expect(lineRangeForOffsets("abc", -1, 2)).toBeNull();
    expect(lineRangeForOffsets("abc", 0, -1)).toBeNull();
  });
});
