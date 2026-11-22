import { describe, expect, it } from "vitest";

import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps a path to the documents", () => {
    expect(safeNextPath("/documents")).toBe("/documents");
    expect(safeNextPath("/documents/cm1abc2def3")).toBe("/documents/cm1abc2def3");
  });

  it("keeps only the path of an absolute URL: never another site", () => {
    expect(safeNextPath("http://localhost:3000/documents/cm1abc2def3")).toBe(
      "/documents/cm1abc2def3",
    );
    expect(safeNextPath("https://evil.example/documents/cm1abc2def3")).toBe(
      "/documents/cm1abc2def3",
    );
  });

  it.each([
    ["another site, protocol-relative", "//evil.example/elsewhere"],
    ["another site, with backslashes", "\\\\evil.example/elsewhere"],
    ["a page outside the documents", "/api/auth/signout"],
    ["a path that climbs out", "/documents/../api/auth/signout"],
    ["a script URL", "javascript:alert(1)"],
    ["nothing", undefined],
  ])("falls back to the documents for %s", (_label, raw) => {
    expect(safeNextPath(raw)).toBe("/documents");
  });
});
