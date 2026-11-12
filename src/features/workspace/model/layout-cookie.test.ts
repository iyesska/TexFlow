import { describe, expect, it } from "vitest";

import { DEFAULT_LAYOUT, layoutReducer } from "./layout";
import { parseLayout, serializeLayout } from "./layout-cookie";

describe("layout cookie", () => {
  it("round-trips a layout", () => {
    const layout = layoutReducer(
      layoutReducer(DEFAULT_LAYOUT, { type: "toggle", pane: "latex" }),
      { type: "move", pane: "preview", direction: "left" },
    );
    expect(parseLayout(serializeLayout(layout))).toEqual(layout);
  });

  it("falls back to the default layout when the cookie is missing", () => {
    expect(parseLayout(undefined)).toBe(DEFAULT_LAYOUT);
    expect(parseLayout("")).toBe(DEFAULT_LAYOUT);
  });

  it.each([
    ["malformed JSON", "%7Bnot-json"],
    ["a bad percent-encoding", "%E0%A4%A"],
    ["an unknown pane", JSON.stringify({ ...DEFAULT_LAYOUT, visible: ["sidebar"] })],
    ["no visible panes", JSON.stringify({ ...DEFAULT_LAYOUT, visible: [] })],
    [
      "a duplicated pane in the order",
      JSON.stringify({ ...DEFAULT_LAYOUT, order: ["markdown", "markdown", "preview"] }),
    ],
    [
      "a non-positive weight",
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        weights: { markdown: 0, latex: 30, preview: 36 },
      }),
    ],
    [
      "an active pane that is hidden",
      JSON.stringify({ ...DEFAULT_LAYOUT, visible: ["latex"], active: "markdown" }),
    ],
  ])("rejects %s", (_label, raw) => {
    expect(parseLayout(raw)).toBe(DEFAULT_LAYOUT);
  });
});
