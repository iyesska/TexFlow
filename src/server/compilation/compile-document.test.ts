// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { findIsolation } from "@/server/sandbox/isolation";

import { compileDocument, type CompileSettings } from "./compile-document";

const settings: CompileSettings = {
  pandocPath: "pandoc",
  tectonicPath: "tectonic",
  cacheDir: process.env.TECTONIC_CACHE_DIR ?? "/var/cache/texflow/tectonic",
};

// These tests need the real toolchain: Tectonic with its package cache, and a host
// that can isolate processes. See scripts/setup-tectonic.sh.
const ready =
  existsSync("/usr/local/bin/tectonic") &&
  existsSync(settings.cacheDir) &&
  (await findIsolation()) !== null;

const png = readFileSync(path.join(process.cwd(), "e2e/fixtures/Diagrama de prueba.png"));

const compile = (markdown: string, images: Parameters<typeof compileDocument>[1] = []) =>
  compileDocument(markdown, images, settings);

describe.skipIf(!ready)("compileDocument", () => {
  it("compiles a document with formulas, a table and code to a PDF", async () => {
    const result = await compile(
      "---\ntitle: Prueba\n---\n\n# Uno\n\nSea $e^{i\\pi}+1=0$.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```python\nprint(1)\n```\n\nNota[^1].\n\n[^1]: Texto.",
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.pdf.length).toBeGreaterThan(5000);
  }, 60_000);

  it("includes the document's images", async () => {
    const withImage = await compile("![Figura](figura.png)", [
      { name: "figura.png", data: png },
    ]);
    const without = await compile("Solo texto.");
    if (!withImage.ok || !without.ok) throw new Error("compile failed");
    expect(withImage.pdf.toString("latin1")).toMatch(/\/Subtype\s*\/Image/);
    expect(without.pdf.toString("latin1")).not.toMatch(/\/Subtype\s*\/Image/);
  }, 60_000);

  it("explains a LaTeX error and points at the Markdown line", async () => {
    const result = await compile("# Título\n\nTexto con \\comandoinexistente{x} dentro.");
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "compile-error",
        diagnostics: [
          {
            severity: "error",
            message:
              "LaTeX no conoce el comando \\comandoinexistente. Revisa cómo está escrito.",
            markdownLine: 3,
          },
        ],
      },
    });
  }, 60_000);

  it("reports an image the document refers to but does not have", async () => {
    const result = await compile("![x](no-esta.png)");
    expect(result).toMatchObject({
      ok: false,
      error: {
        diagnostics: [
          { message: expect.stringContaining("«no-esta.png»"), markdownLine: 1 },
        ],
      },
    });
  }, 60_000);

  it("cannot see the server's files", async () => {
    // The document fails to compile if the file exists from where LaTeX stands.
    const probe = (file: string) =>
      compile(`\\IfFileExists{${file}}{\\ArchivoVisibleDesdeLatex}{}\n\nTexto.`);

    // Control: the job's own source is visible, so the probe does detect files.
    expect((await probe("main.tex")).ok).toBe(false);

    for (const file of [
      "/etc/passwd",
      "/etc/hostname",
      "/proc/self/environ",
      "/proc/1/environ",
      `${process.cwd()}/package.json`,
      `${process.cwd()}/.env`,
    ]) {
      expect((await probe(file)).ok, file).toBe(true);
    }
  }, 180_000);

  it("cannot run commands", async () => {
    const marker = "/tmp/texflow-shell-escape-marker";
    await compile(`\\immediate\\write18{touch ${marker}}\n\nTexto.`);
    expect(existsSync(marker)).toBe(false);
  }, 60_000);

  it("stops a document that never finishes", async () => {
    const result = await compileDocument(
      "\\loop\\iftrue\\repeat",
      [],
      settings,
      AbortSignal.timeout(3000),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "limit-exceeded" } });
  }, 60_000);

  it("reports a Markdown problem before LaTeX ever runs", async () => {
    const result = await compile("---\ntitle: [a\n---\n");
    expect(result).toMatchObject({ ok: false, error: { code: "syntax", line: 2 } });
  });
});

describe("compileDocument without the toolchain", () => {
  it("says the feature is unavailable when Tectonic is missing", async () => {
    const result = await compileDocument("x", [], {
      ...settings,
      tectonicPath: "/no/such/tectonic",
    });
    expect(result).toMatchObject({ ok: false, error: { code: "unavailable" } });
  });
});
