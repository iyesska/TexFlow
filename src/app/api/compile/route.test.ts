// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  COMPILE_FIELDS,
  COMPILE_WARNINGS_HEADER,
  compileFailureSchema,
  diagnosticsSchema,
} from "@/contracts/compilation";
import { findIsolation } from "@/server/sandbox/isolation";

import { POST } from "./route";

const ready =
  existsSync("/usr/local/bin/tectonic") &&
  existsSync("/var/cache/texflow/tectonic") &&
  (await findIsolation()) !== null;

const png = readFileSync(path.join(process.cwd(), "e2e/fixtures/Diagrama de prueba.png"));

function post(fields: { markdown?: string; images?: [name: string, data: BlobPart][] }) {
  const form = new FormData();
  if (fields.markdown !== undefined) form.set(COMPILE_FIELDS.markdown, fields.markdown);
  for (const [name, data] of fields.images ?? []) {
    form.append(COMPILE_FIELDS.image, new File([data], name));
  }
  return POST(
    new Request("http://localhost/api/compile", { method: "POST", body: form }),
  );
}

describe("POST /api/compile validation", () => {
  it("rejects a request without a document or that is not a form", async () => {
    expect((await post({})).status).toBe(400);
    const json = new Request("http://localhost/api/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect((await POST(json)).status).toBe(400);
  });

  it.each([
    ["a path as a name", "../../etc/cron.d/x.png", png],
    ["a name the app would never generate", "Mi Foto.png", png],
    ["content that is not an image", "falsa.png", "<script>alert(1)</script>"],
    ["an extension that contradicts the content", "foto.jpg", png],
  ])("rejects an image with %s", async (_label, name, data) => {
    const response = await post({ markdown: "x", images: [[name, data]] });
    expect(response.status).toBe(400);
  });

  it("rejects two images with the same name", async () => {
    const response = await post({
      markdown: "x",
      images: [
        ["a.png", png],
        ["a.png", png],
      ],
    });
    expect(response.status).toBe(400);
  });
});

describe.skipIf(!ready)("POST /api/compile", () => {
  it("answers with the PDF and its warnings", async () => {
    const response = await post({
      markdown: "# Hola\n\n![Figura](figura.png)",
      images: [["figura.png", png]],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    const pdf = Buffer.from(await response.arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");

    const header = response.headers.get(COMPILE_WARNINGS_HEADER) ?? "";
    expect(
      diagnosticsSchema.safeParse(JSON.parse(decodeURIComponent(header))).success,
    ).toBe(true);
  }, 60_000);

  it("answers a LaTeX error with 422 and diagnostics", async () => {
    const response = await post({ markdown: "Texto \\noexiste aquí." });
    expect(response.status).toBe(422);
    const failure = compileFailureSchema.parse(await response.json());
    expect(failure.error.code).toBe("compile-error");
    expect(failure.error.diagnostics?.[0]?.markdownLine).toBe(1);
  }, 60_000);
});
