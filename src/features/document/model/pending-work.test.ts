import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, templateSettings } from "@/templates/catalog";

import {
  differsFrom,
  forgetPendingWork,
  keepPendingWork,
  readPendingWork,
} from "./pending-work";

const change = { markdown: "# Pendiente", settings: DEFAULT_SETTINGS, baseRevision: 2 };

afterEach(() => window.sessionStorage.clear());

describe("pending work", () => {
  it("keeps unsaved work per document until it is forgotten", () => {
    keepPendingWork(window.sessionStorage, "doc-a", change);
    expect(readPendingWork(window.sessionStorage, "doc-a")).toEqual(change);
    expect(readPendingWork(window.sessionStorage, "doc-b")).toBeNull();
    forgetPendingWork(window.sessionStorage, "doc-a");
    expect(readPendingWork(window.sessionStorage, "doc-a")).toBeNull();
  });

  it("ignores what does not read as unsaved work", () => {
    window.sessionStorage.setItem("texflow:pending:doc-a", "{roto");
    expect(readPendingWork(window.sessionStorage, "doc-a")).toBeNull();
    window.sessionStorage.setItem(
      "texflow:pending:doc-a",
      JSON.stringify({ ...change, settings: { templateId: "poster" } }),
    );
    expect(readPendingWork(window.sessionStorage, "doc-a")).toBeNull();
  });

  it("tells whether kept work differs from the open document", () => {
    const snapshot = {
      markdown: "# Pendiente",
      settings: DEFAULT_SETTINGS,
      status: "saved" as const,
      manualTitle: null,
    };
    expect(differsFrom(change, snapshot)).toBe(false);
    expect(differsFrom({ ...change, markdown: "# Otro" }, snapshot)).toBe(true);
    expect(
      differsFrom({ ...change, settings: templateSettings("thesis") }, snapshot),
    ).toBe(true);
  });
});
