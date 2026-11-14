import { afterEach, describe, expect, it, vi } from "vitest";

import { COMPILE_WARNINGS_HEADER } from "@/contracts/compilation";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { requestCompilation } from "./request-compilation";
import { compilationKey } from "./used-images";

describe("compilationKey", () => {
  it("changes with the text or the set of images, not with their order", () => {
    const key = compilationKey("texto", ["b.png", "a.png"], "diseño");
    expect(compilationKey("texto", ["a.png", "b.png"], "diseño")).toBe(key);
    expect(compilationKey("texto!", ["a.png", "b.png"], "diseño")).not.toBe(key);
    expect(compilationKey("texto", ["a.png"], "diseño")).not.toBe(key);
    expect(compilationKey("texto", ["a.png", "b.png"], "otro diseño")).not.toBe(key);
  });
});

const request = (markdown: string) => ({
  markdown,
  settings: DEFAULT_SETTINGS,
  documentId: "doc12345",
});

describe("requestCompilation", () => {
  afterEach(() => vi.unstubAllGlobals());
  const signal = new AbortController().signal;

  it("sends the document as a form, naming the stored document for its images", async () => {
    const fetchMock = vi.fn(async () => new Response("x", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await requestCompilation(request("# Hola"), signal);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect(url).toBe("/api/compile");
    expect(form.get("markdown")).toBe("# Hola");
    expect(form.get("documentId")).toBe("doc12345");
    expect(form.getAll("image")).toEqual([]);
    expect(JSON.parse(form.get("settings") as string)).toEqual(DEFAULT_SETTINGS);
  });

  it("returns the PDF and its warnings", async () => {
    const warnings = [{ severity: "warning", message: "Una línea sobresale 3 pt." }];
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(new Uint8Array([37, 80, 68, 70]), {
          headers: {
            "content-type": "application/pdf",
            [COMPILE_WARNINGS_HEADER]: encodeURIComponent(JSON.stringify(warnings)),
          },
        }),
    );
    const outcome = await requestCompilation(request("x"), signal);
    expect(outcome).toEqual({
      ok: true,
      pdf: new Uint8Array([37, 80, 68, 70]),
      warnings,
    });
  });

  it("returns the server's diagnostics for a document that does not compile", async () => {
    const body = {
      ok: false,
      error: {
        code: "compile-error",
        message: "El documento tiene un error.",
        diagnostics: [
          { severity: "error", message: "LaTeX no conoce \\foo.", markdownLine: 3 },
        ],
      },
    };
    vi.stubGlobal("fetch", async () => Response.json(body, { status: 422 }));
    expect(await requestCompilation(request("x"), signal)).toEqual(body);
  });

  it("turns a network failure or a garbled answer into an error", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    expect(await requestCompilation(request("x"), signal)).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });

    vi.stubGlobal("fetch", async () => new Response("<html>", { status: 502 }));
    expect(await requestCompilation(request("x"), signal)).toMatchObject({
      ok: false,
      error: { code: "failed" },
    });
  });
});
