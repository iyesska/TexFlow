// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/server/auth/session";
import { createDocument, getDocument } from "@/server/documents/documents";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { apiRequest, routeContext } from "@/server/testing/requests";
import { signInAs } from "@/server/testing/session-mock";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { DELETE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

let user: SessionUser;

const create = (name: unknown) =>
  POST(apiRequest("POST", "/api/folders", { json: { name } }));

describe.skipIf(!databaseAvailable)("/api/folders", () => {
  beforeEach(async () => {
    user = await createTestUser();
    signInAs(user);
  });

  it("creates folders with unique names and lists them", async () => {
    const response = await create("  Tesis ");
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      folder: { name: "Tesis", documentCount: 0 },
    });
    const repeated = await create("Tesis");
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({ error: { code: "name-taken" } });

    const list = await (await GET(apiRequest("GET", "/api/folders"))).json();
    expect(list.folders.map(({ name }: { name: string }) => name)).toEqual(["Tesis"]);
  });

  it("refuses an empty name", async () => {
    const response = await create("   ");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { message: "Escribe un nombre para la carpeta." },
    });
  });

  it("renames a folder, and deletes it keeping its documents", async () => {
    const { folder } = await (await create("Clases")).json();
    const document = await createDocument(user.id, {
      markdown: "x",
      settings: DEFAULT_SETTINGS,
      folderId: folder.id,
    });
    if (!document.ok) throw new Error(document.reason);

    const renamed = await PATCH(
      apiRequest("PATCH", `/api/folders/${folder.id}`, { json: { name: "Apuntes" } }),
      routeContext({ id: folder.id }),
    );
    expect(await renamed.json()).toMatchObject({
      folder: { name: "Apuntes", documentCount: 1 },
    });

    const deleted = await DELETE(
      apiRequest("DELETE", `/api/folders/${folder.id}`),
      routeContext({ id: folder.id }),
    );
    expect(deleted.status).toBe(204);
    expect((await getDocument(user.id, document.document.id))?.folderId).toBeNull();
  });

  it("does not touch someone else's folder", async () => {
    const { folder } = await (await create("Privada")).json();
    signInAs(await createTestUser());
    const response = await DELETE(
      apiRequest("DELETE", `/api/folders/${folder.id}`),
      routeContext({ id: folder.id }),
    );
    expect(response.status).toBe(404);
  });
});
