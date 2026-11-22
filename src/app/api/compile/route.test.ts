// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  COMPILE_FIELDS,
  COMPILE_WARNINGS_HEADER,
  compileFailureSchema,
  diagnosticsSchema,
} from "@/contracts/compilation";
import { addAsset } from "@/server/assets/assets";
import { createDocument } from "@/server/documents/documents";
import { findIsolation } from "@/server/sandbox/isolation";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { signInAs, TEST_USER } from "@/server/testing/session-mock";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { POST } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

beforeEach(() => signInAs(TEST_USER));

const ready =
  existsSync("/usr/local/bin/tectonic") &&
  existsSync("/var/cache/texflow/tectonic") &&
  (await findIsolation()) !== null;

const png = readFileSync(path.join(process.cwd(), "e2e/fixtures/Diagrama de prueba.png"));

function post(fields: {
  markdown?: string;
  images?: [name: string, data: BlobPart][];
  documentId?: string;
}) {
  const form = new FormData();
  if (fields.markdown !== undefined) form.set(COMPILE_FIELDS.markdown, fields.markdown);
  if (fields.documentId !== undefined)
    form.set(COMPILE_FIELDS.documentId, fields.documentId);
  for (const [name, data] of fields.images ?? []) {
    form.append(COMPILE_FIELDS.image, new File([data], name));
  }
  return POST(
    new Request("http://localhost/api/compile", { method: "POST", body: form }),
  );
}

describe("POST /api/compile validation", () => {
  it("answers 401 without a session", async () => {
    signInAs(null);
    const response = await post({ markdown: "x" });
    expect(response.status).toBe(401);
    expect(compileFailureSchema.parse(await response.json()).error.code).toBe(
      "unauthorized",
    );
  });

  it("rejects a document id that is not one", async () => {
    expect((await post({ markdown: "x", documentId: "../x" })).status).toBe(400);
  });

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

describe.skipIf(!databaseAvailable)("POST /api/compile with a stored document", () => {
  it("refuses another user's document", async () => {
    const owner = await createTestUser();
    const created = await createDocument(owner.id, {
      markdown: "x",
      settings: DEFAULT_SETTINGS,
    });
    if (!created.ok) throw new Error("setup failed");
    const stranger = await createTestUser();
    signInAs(stranger);
    expect((await post({ markdown: "x", documentId: created.document.id })).status).toBe(
      400,
    );
  });

  it.skipIf(!ready)(
    "compiles with the images stored with the document",
    async () => {
      const user = await createTestUser();
      signInAs(user);
      const markdown = "![Figura](diagrama.png)";
      const created = await createDocument(user.id, {
        markdown,
        settings: DEFAULT_SETTINGS,
      });
      if (!created.ok) throw new Error("setup failed");
      await addAsset(user.id, created.document.id, "Diagrama.png", new Uint8Array(png));

      const response = await post({ markdown, documentId: created.document.id });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
    },
    60_000,
  );
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
