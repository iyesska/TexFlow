import { describe, expect, it } from "vitest";

import {
  DEFAULT_LAYOUT,
  layoutReducer,
  neighbourOf,
  paneShares,
  type WorkspaceLayout,
} from "./layout";

const sum = (values: Array<number | undefined>) =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

describe("layoutReducer", () => {
  it("hides a visible pane and shows it again in its original position", () => {
    const hidden = layoutReducer(DEFAULT_LAYOUT, { type: "toggle", pane: "latex" });
    expect(hidden.visible).toEqual(["markdown", "preview"]);

    const shown = layoutReducer(hidden, { type: "toggle", pane: "latex" });
    expect(shown.visible).toEqual(["markdown", "latex", "preview"]);
  });

  it("never hides the last visible pane", () => {
    const solo = layoutReducer(DEFAULT_LAYOUT, { type: "solo", pane: "preview" });
    expect(layoutReducer(solo, { type: "toggle", pane: "preview" })).toBe(solo);
  });

  it("moves the active pane to a visible one when the active pane is hidden", () => {
    const next = layoutReducer(DEFAULT_LAYOUT, { type: "toggle", pane: "markdown" });
    expect(next.active).toBe("latex");
  });

  it("activating a hidden pane makes it visible", () => {
    const hidden = layoutReducer(DEFAULT_LAYOUT, { type: "toggle", pane: "preview" });
    const next = layoutReducer(hidden, { type: "activate", pane: "preview" });
    expect(next.active).toBe("preview");
    expect(next.visible).toContain("preview");
  });

  it("swaps a pane with its visible neighbour, skipping hidden panes", () => {
    const withoutLatex = layoutReducer(DEFAULT_LAYOUT, { type: "toggle", pane: "latex" });
    const moved = layoutReducer(withoutLatex, {
      type: "move",
      pane: "preview",
      direction: "left",
    });
    expect(moved.visible).toEqual(["preview", "markdown"]);
    expect([...moved.order].sort()).toEqual(["latex", "markdown", "preview"]);
  });

  it("ignores a move past the edge", () => {
    const action = { type: "move", pane: "markdown", direction: "left" } as const;
    expect(layoutReducer(DEFAULT_LAYOUT, action)).toBe(DEFAULT_LAYOUT);
    expect(neighbourOf(DEFAULT_LAYOUT, "preview", "right")).toBeUndefined();
  });

  it("stores resized widths and reports them back as shares", () => {
    const resized = layoutReducer(DEFAULT_LAYOUT, {
      type: "resize",
      sizes: { markdown: 50, latex: 20, preview: 30 },
    });
    const shares = paneShares(resized);
    expect(shares.markdown).toBeCloseTo(50);
    expect(shares.latex).toBeCloseTo(20);
    expect(shares.preview).toBeCloseTo(30);
  });

  it("keeps a hidden pane's width when the others are resized", () => {
    const hidden = layoutReducer(DEFAULT_LAYOUT, { type: "toggle", pane: "latex" });
    const resized = layoutReducer(hidden, {
      type: "resize",
      sizes: { markdown: 70, preview: 30 },
    });
    expect(resized.weights.latex).toBe(DEFAULT_LAYOUT.weights.latex);
    expect(paneShares(resized).markdown).toBeCloseTo(70);
  });

  it("returns the same layout for a resize that changes nothing or is incomplete", () => {
    const shares = paneShares(DEFAULT_LAYOUT);
    expect(layoutReducer(DEFAULT_LAYOUT, { type: "resize", sizes: shares })).toBe(
      DEFAULT_LAYOUT,
    );
    expect(
      layoutReducer(DEFAULT_LAYOUT, { type: "resize", sizes: { markdown: 50 } }),
    ).toBe(DEFAULT_LAYOUT);
  });

  it("restores every pane with showAll and the defaults with reset", () => {
    const solo = layoutReducer(DEFAULT_LAYOUT, { type: "solo", pane: "latex" });
    expect(layoutReducer(solo, { type: "showAll" }).visible).toHaveLength(3);
    expect(layoutReducer(solo, { type: "reset" })).toBe(DEFAULT_LAYOUT);
  });
});

describe("paneShares", () => {
  it("always sums to 100 across the visible panes", () => {
    const layouts: WorkspaceLayout[] = [
      DEFAULT_LAYOUT,
      layoutReducer(DEFAULT_LAYOUT, { type: "toggle", pane: "markdown" }),
      layoutReducer(DEFAULT_LAYOUT, { type: "solo", pane: "preview" }),
    ];
    for (const layout of layouts) {
      expect(sum(Object.values(paneShares(layout)))).toBeCloseTo(100);
    }
  });
});
