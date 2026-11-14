import { describe, expect, it } from "vitest";

import { minimalChange } from "./text-diff";

const apply = (previous: string, next: string) => {
  const change = minimalChange(previous, next);
  if (!change) return previous;
  return previous.slice(0, change.from) + change.insert + previous.slice(change.to);
};

describe("minimalChange", () => {
  it("returns null when nothing changed", () => {
    expect(minimalChange("igual", "igual")).toBeNull();
  });

  it("replaces only the part that differs", () => {
    expect(minimalChange("\\section{Uno}\nfin", "\\section{Dos}\nfin")).toEqual({
      from: 9,
      to: 12,
      insert: "Dos",
    });
  });

  it.each([
    ["", "nuevo"],
    ["viejo", ""],
    ["aaa", "aa"],
    ["aa", "aaa"],
    ["abcabc", "abc"],
    ["inicio medio fin", "inicio fin"],
    ["x", "y"],
  ])("turns %j into %j", (previous, next) => {
    expect(apply(previous, next)).toBe(next);
  });
});
