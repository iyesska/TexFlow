// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { documentSchema } from "@/contracts/documents";
import type { SessionUser } from "@/server/auth/session";
import { createDocument } from "@/server/documents/documents";
import { createFolder } from "@/server/folders/folders";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { apiRequest, routeContext } from "@/server/testing/requests";
import { signInAs } from "@/server/testing/session-mock";
import { DEFAULT_SETTINGS, templateSettings } from "@/templates/catalog";

import { POST as duplicate } from "./duplicate/route";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

let user: SessionUser;
let id: string;

async function patch(json: unknown, documentId = id) {
  return PATCH(
    apiRequest("PATCH", `/api/documents/${documentId}`, { json }),
    routeContext({ id: documentId }),
  );
}

async function get(documentId = id) {
  return GET(
    apiRequest("GET", `/api/documents/${documentId}`),
    routeContext({ id: documentId }),
  );
}

describe.skipIf(!databaseAvailable)("/api/documents/[id]", () => {
  beforeEach(async () => {
    user = await createTestUser();
    signInAs(user);
    const created = await createDocument(user.id, {
      markdown: "# Informe\n\nTexto.",
      settings: DEFAULT_SETTINGS,
    });
    if (!created.ok) throw new Error(created.reason);
    id = created.document.id;
  });

  it("returns the document with its text, design and revision", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    const { document } = await response.json();
    expect(documentSchema.parse(document)).toMatchObject({
      id,
      title: "Informe",
      markdown: "# Informe\n\nTexto.",
      revision: 0,
    });
  });

  it("answers 404 for someone else's document and for a malformed id", async () => {
    signInAs(await createTestUser());
    expect((await get()).status).toBe(404);
    expect((await get("../../etc")).status).toBe(404);
    expect((await patch({ action: "rename", title: "Mío" })).status).toBe(404);
  });

  it("saves on top of the revision it was edited from, and refuses a stale save", async () => {
    const saved = await patch({
      action: "save",
      markdown: "# Informe final",
      settings: templateSettings("thesis"),
      baseRevision: 0,
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      ok: true,
      revision: 1,
      title: "Informe final",
    });

    const stale = await patch({
      action: "save",
      markdown: "# Otra pestaña",
      settings: DEFAULT_SETTINGS,
      baseRevision: 0,
    });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({
      error: { code: "conflict", revision: 1 },
    });
    const { document } = await (await get()).json();
    expect(document).toMatchObject({ markdown: "# Informe final", revision: 1 });
    expect(document.settings.templateId).toBe("thesis");
  });

  it("renames a document, and lets its title follow the text again", async () => {
    const renamed = await patch({ action: "rename", title: "  Mi nombre  " });
    expect(await renamed.json()).toMatchObject({
      document: { title: "Mi nombre", titleSource: "manual" },
    });
    const reset = await patch({ action: "rename", title: null });
    expect(await reset.json()).toMatchObject({
      document: { title: "Informe", titleSource: "content" },
    });
  });

  it("moves a document into a folder and out again", async () => {
    const folder = await createFolder(user.id, "Clases");
    if (!folder.ok) throw new Error(folder.reason);
    const moved = await patch({ action: "move", folderId: folder.folder.id });
    expect(await moved.json()).toMatchObject({
      document: { folderId: folder.folder.id },
    });
    const out = await patch({ action: "move", folderId: null });
    expect(await out.json()).toMatchObject({ document: { folderId: null } });
  });

  it.each([
    ["an unknown action", { action: "publish" }],
    ["a save without a revision", { action: "save", markdown: "x", settings: {} }],
  ])("refuses %s", async (_label, json) => {
    expect((await patch(json)).status).toBe(400);
  });

  it("duplicates a document, named as a copy", async () => {
    const response = await duplicate(
      apiRequest("POST", `/api/documents/${id}/duplicate`),
      routeContext({ id }),
    );
    expect(response.status).toBe(201);
    const { document } = await response.json();
    expect(document).toMatchObject({ title: "Informe (copia)", titleSource: "manual" });
    expect(document.id).not.toBe(id);
  });

  it("deletes a document", async () => {
    const response = await DELETE(
      apiRequest("DELETE", `/api/documents/${id}`),
      routeContext({ id }),
    );
    expect(response.status).toBe(204);
    expect((await get()).status).toBe(404);
  });
});
