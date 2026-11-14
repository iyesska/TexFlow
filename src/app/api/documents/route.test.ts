// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LIMITS } from "@/config/limits";
import { documentSummarySchema } from "@/contracts/documents";
import { createFolder } from "@/server/folders/folders";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { apiRequest } from "@/server/testing/requests";
import { signInAs } from "@/server/testing/session-mock";

import { GET, POST } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

describe.skipIf(!databaseAvailable)("/api/documents", () => {
  beforeEach(async () => signInAs(await createTestUser()));

  it("answers 401 without a session", async () => {
    signInAs(null);
    expect((await GET(apiRequest("GET", "/api/documents"))).status).toBe(401);
    const response = await POST(apiRequest("POST", "/api/documents", { json: {} }));
    expect(response.status).toBe(401);
  });

  it("creates a document, titled by its text, and lists it with the folders", async () => {
    const response = await POST(
      apiRequest("POST", "/api/documents", { json: { markdown: "# Informe\n\nTexto." } }),
    );
    expect(response.status).toBe(201);
    const { document } = await response.json();
    expect(documentSummarySchema.parse(document)).toMatchObject({
      title: "Informe",
      titleSource: "content",
      folderId: null,
      templateId: "academic-paper",
    });

    const list = await (await GET(apiRequest("GET", "/api/documents"))).json();
    expect(list).toMatchObject({ ok: true, folders: [] });
    expect(list.documents.map(({ id }: { id: string }) => id)).toEqual([document.id]);
  });

  it("creates a document in a folder, but not in someone else's", async () => {
    const mine = await POST(apiRequest("POST", "/api/documents", { json: {} }));
    expect(mine.status).toBe(201);

    const stranger = await createTestUser();
    const folder = await createFolder(stranger.id, "Ajena");
    if (!folder.ok) throw new Error(folder.reason);
    const response = await POST(
      apiRequest("POST", "/api/documents", { json: { folderId: folder.folder.id } }),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "folder-not-found" } });
  });

  it.each([
    ["settings that do not validate", { settings: { templateId: "poster" } }, 400],
    ["a folder id that is not one", { folderId: "../x" }, 400],
    [
      "a text over the limit",
      { markdown: "a".repeat(LIMITS.maxMarkdownLength + 1) },
      413,
    ],
  ])("refuses %s", async (_label, json, status) => {
    const response = await POST(apiRequest("POST", "/api/documents", { json }));
    expect(response.status).toBe(status);
  });

  it("refuses a change requested from another site", async () => {
    const response = await POST(
      apiRequest("POST", "/api/documents", {
        json: {},
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { message: "Origen no permitido." },
    });
  });
});
