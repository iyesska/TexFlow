import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useTabTitle } from "./use-tab-title";

/** Lets the mutation observer's callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.querySelectorAll("title").forEach((title) => title.remove());
});

describe("useTabTitle", () => {
  it("sets the tab's title", () => {
    renderHook(() => useTabTitle("Informe — TexFlow"));
    expect(document.title).toBe("Informe — TexFlow");
  });

  it("puts it back when the page's own title is set again, wherever it is", async () => {
    // The page's metadata, streamed into the body before the hook runs.
    const streamed = document.createElement("title");
    streamed.textContent = "Notas — TexFlow";
    document.body.append(streamed);
    renderHook(() => useTabTitle("Diario — TexFlow"));
    expect(document.title).toBe("Diario — TexFlow");

    // React hydrating the metadata writes its own text back.
    streamed.textContent = "Notas — TexFlow";
    await settle();
    expect(document.title).toBe("Diario — TexFlow");
  });

  it("wins over a <title> that arrives later, first in <head>", async () => {
    renderHook(() => useTabTitle("Diario — TexFlow"));
    const hoisted = document.createElement("title");
    hoisted.textContent = "Notas — TexFlow";
    document.head.prepend(hoisted);
    await settle();
    expect(document.title).toBe("Diario — TexFlow");
  });

  it("follows the title as it changes, and lets go when unmounted", async () => {
    const { rerender, unmount } = renderHook(({ title }) => useTabTitle(title), {
      initialProps: { title: "Uno — TexFlow" },
    });
    rerender({ title: "Dos — TexFlow" });
    expect(document.title).toBe("Dos — TexFlow");
    unmount();
    document.title = "Otra página";
    await settle();
    expect(document.title).toBe("Otra página");
  });
});
