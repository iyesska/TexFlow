// @vitest-environment node
import { describe, expect, it } from "vitest";

import { addAsset, getAsset, listAssets } from "@/server/assets/assets";
import {
  createFolder,
  deleteFolder,
  listFolders,
  renameFolder,
} from "@/server/folders/folders";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { DEFAULT_SETTINGS, templateSettings } from "@/templates/catalog";

import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  getDocument,
  listDocuments,
  moveDocument,
  renameDocument,
  saveDocumentContent,
} from "./documents";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function newDocument(ownerId: string, markdown = "# Mi informe\n\nTexto.") {
  const result = await createDocument(ownerId, { markdown, settings: DEFAULT_SETTINGS });
  if (!result.ok) throw new Error(result.reason);
  return result.document;
}

describe.skipIf(!databaseAvailable)("documents", () => {
  it("creates a document titled after its text, and lists it", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    expect(document).toMatchObject({
      title: "Mi informe",
      titleSource: "content",
      revision: 0,
      settings: DEFAULT_SETTINGS,
      folderId: null,
    });
    const list = await listDocuments(user.id);
    expect(list).toEqual([
      expect.objectContaining({ id: document.id, title: "Mi informe" }),
    ]);
  });

  it("keeps each user's documents out of everyone else's reach", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const document = await newDocument(owner.id);

    expect(await getDocument(stranger.id, document.id)).toBeNull();
    expect(await listDocuments(stranger.id)).toEqual([]);
    expect(
      await saveDocumentContent(stranger.id, document.id, {
        markdown: "robado",
        settings: DEFAULT_SETTINGS,
        baseRevision: 0,
      }),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(await renameDocument(stranger.id, document.id, "Mío")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await duplicateDocument(stranger.id, document.id)).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await deleteDocument(stranger.id, document.id)).toBe(false);
    expect((await getDocument(owner.id, document.id))?.markdown).toContain("Texto.");
  });

  it("saves on top of the revision it was edited from, and refuses a stale save", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);

    const first = await saveDocumentContent(user.id, document.id, {
      markdown: "# Nuevo título\n\nMás.",
      settings: templateSettings("thesis"),
      baseRevision: 0,
    });
    expect(first).toMatchObject({ ok: true, revision: 1, title: "Nuevo título" });

    const stale = await saveDocumentContent(user.id, document.id, {
      markdown: "Una pestaña antigua",
      settings: DEFAULT_SETTINGS,
      baseRevision: 0,
    });
    expect(stale).toEqual({ ok: false, reason: "conflict", revision: 1 });

    const saved = await getDocument(user.id, document.id);
    expect(saved).toMatchObject({ markdown: "# Nuevo título\n\nMás.", revision: 1 });
    expect(saved?.settings.templateId).toBe("thesis");
  });

  it("accepts a save of what is already stored, even on an older revision", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    const change = {
      markdown: "# Lo mismo",
      settings: templateSettings("thesis"),
      baseRevision: 0,
    };
    expect(await saveDocumentContent(user.id, document.id, change)).toMatchObject({
      ok: true,
      revision: 1,
    });
    // The same save again, as a reloaded page sends it: not a conflict, and no write.
    expect(await saveDocumentContent(user.id, document.id, change)).toMatchObject({
      ok: true,
      revision: 1,
    });
  });

  it("keeps the bibliography, and leaves it alone when a save does not send it", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    const bibliography = "@book{a, title={A}}";
    await saveDocumentContent(user.id, document.id, {
      markdown: "# Con citas [@a]",
      settings: DEFAULT_SETTINGS,
      bibliography,
      baseRevision: 0,
    });
    await saveDocumentContent(user.id, document.id, {
      markdown: "# Con citas [@a], más texto",
      settings: DEFAULT_SETTINGS,
      baseRevision: 1,
    });
    expect(await getDocument(user.id, document.id)).toMatchObject({
      bibliography,
      revision: 2,
    });

    const copy = await duplicateDocument(user.id, document.id);
    if (!copy.ok) throw new Error(copy.reason);
    expect(copy.document.bibliography).toBe(bibliography);
  });

  it("keeps a name given by hand, and goes back to the text's title when it is cleared", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);

    const renamed = await renameDocument(user.id, document.id, "  Entrega final  ");
    expect(renamed).toMatchObject({
      ok: true,
      document: { title: "Entrega final", titleSource: "manual" },
    });
    await saveDocumentContent(user.id, document.id, {
      markdown: "# Otro título",
      settings: DEFAULT_SETTINGS,
      baseRevision: 0,
    });
    expect((await getDocument(user.id, document.id))?.title).toBe("Entrega final");

    const cleared = await renameDocument(user.id, document.id, null);
    expect(cleared).toMatchObject({
      ok: true,
      document: { title: "Otro título", titleSource: "content" },
    });
  });

  it("opens a document whose stored design no longer validates with the default one", async () => {
    const user = await createTestUser();
    const result = await createDocument(user.id, {
      markdown: "x",
      settings: { ...DEFAULT_SETTINGS, font: "comic-sans" } as never,
    });
    if (!result.ok) throw new Error(result.reason);
    expect((await getDocument(user.id, result.document.id))?.settings).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("duplicates a document with its design and images, named as a copy", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    await addAsset(user.id, document.id, "Figura.png", PNG);

    const copy = await duplicateDocument(user.id, document.id);
    if (!copy.ok) throw new Error(copy.reason);
    expect(copy.document).toMatchObject({
      title: "Mi informe (copia)",
      titleSource: "manual",
    });
    expect(await listAssets(user.id, copy.document.id)).toEqual([
      { name: "figura.png", type: "image/png", size: PNG.length },
    ]);
  });

  it("deletes a document with its images", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    await addAsset(user.id, document.id, "a.png", PNG);
    expect(await deleteDocument(user.id, document.id)).toBe(true);
    expect(await getDocument(user.id, document.id)).toBeNull();
    expect(await getAsset(user.id, document.id, "a.png")).toBeNull();
  });
});

describe.skipIf(!databaseAvailable)("folders", () => {
  it("creates, renames and counts folders, and refuses a repeated name", async () => {
    const user = await createTestUser();
    const created = await createFolder(user.id, " Universidad ");
    if (!created.ok) throw new Error(created.reason);
    expect(created.folder).toMatchObject({ name: "Universidad", documentCount: 0 });
    expect(await createFolder(user.id, "Universidad")).toEqual({
      ok: false,
      reason: "name-taken",
    });

    const document = await newDocument(user.id);
    await moveDocument(user.id, document.id, created.folder.id);
    expect(await renameFolder(user.id, created.folder.id, "Máster")).toMatchObject({
      ok: true,
      folder: { name: "Máster", documentCount: 1 },
    });
  });

  it("allows the same folder name for different people", async () => {
    const one = await createTestUser();
    const two = await createTestUser();
    expect((await createFolder(one.id, "Tesis")).ok).toBe(true);
    expect((await createFolder(two.id, "Tesis")).ok).toBe(true);
  });

  it("moves documents only into the owner's own folders", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const theirs = await createFolder(stranger.id, "Ajena");
    if (!theirs.ok) throw new Error(theirs.reason);
    const document = await newDocument(owner.id);

    expect(await moveDocument(owner.id, document.id, theirs.folder.id)).toEqual({
      ok: false,
      reason: "folder-not-found",
    });
    expect(
      await createDocument(owner.id, {
        markdown: "x",
        settings: DEFAULT_SETTINGS,
        folderId: theirs.folder.id,
      }),
    ).toEqual({ ok: false, reason: "folder-not-found" });
  });

  it("keeps a deleted folder's documents, outside any folder", async () => {
    const user = await createTestUser();
    const folder = await createFolder(user.id, "Temporal");
    if (!folder.ok) throw new Error(folder.reason);
    const document = await newDocument(user.id);
    await moveDocument(user.id, document.id, folder.folder.id);

    expect(await deleteFolder(user.id, folder.folder.id)).toBe(true);
    expect(await listFolders(user.id)).toEqual([]);
    expect((await getDocument(user.id, document.id))?.folderId).toBeNull();
  });
});

describe.skipIf(!databaseAvailable)("assets", () => {
  it("stores an image under a name the server chooses, typed by its content", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    expect(await addAsset(user.id, document.id, "Mi Figura.PNG", PNG)).toEqual({
      ok: true,
      asset: { name: "mi-figura.png", type: "image/png", size: PNG.length },
    });
    expect(await addAsset(user.id, document.id, "mi figura.png", PNG)).toMatchObject({
      ok: true,
      asset: { name: "mi-figura-2.png" },
    });
    const stored = await getAsset(user.id, document.id, "mi-figura.png");
    expect(stored?.type).toBe("image/png");
    expect(Buffer.from(stored!.data!)).toEqual(Buffer.from(PNG));

    // A client that has this version already is not sent the bytes again.
    const again = await getAsset(user.id, document.id, "mi-figura.png", stored!.version);
    expect(again).toMatchObject({ version: stored!.version, data: null });
  });

  it("refuses files that are not images, and other people's documents", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const document = await newDocument(owner.id);
    const html = new TextEncoder().encode("<script>alert(1)</script>");

    expect(await addAsset(owner.id, document.id, "x.png", html)).toEqual({
      ok: false,
      reason: "unsupported-type",
    });
    expect(await addAsset(stranger.id, document.id, "x.png", PNG)).toEqual({
      ok: false,
      reason: "not-found",
    });
    await addAsset(owner.id, document.id, "a.png", PNG);
    expect(await getAsset(stranger.id, document.id, "a.png")).toBeNull();
    expect(await listAssets(stranger.id, document.id)).toBeNull();
    expect(await getAsset(owner.id, document.id, "../../etc/passwd")).toBeNull();
  });
});
