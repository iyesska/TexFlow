// @vitest-environment node
import { describe, expect, it } from "vitest";

import { addAsset, getAsset } from "@/server/assets/assets";
import { db } from "@/server/db/client";
import { createFolder, deleteFolder } from "@/server/folders/folders";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { createDocument, getDocument, moveDocument, trashDocument } from "./documents";
import {
  countTrash,
  deleteForever,
  emptyTrash,
  listTrash,
  purgeExpiredTrash,
  restoreDocument,
} from "./trash";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const DAY_MS = 86_400_000;

async function trashed(ownerId: string, markdown: string) {
  const result = await createDocument(ownerId, { markdown, settings: DEFAULT_SETTINGS });
  if (!result.ok) throw new Error(result.reason);
  await trashDocument(ownerId, result.document.id);
  return result.document;
}

/** Pretends a document went to the trash `days` ago. */
async function trashedDaysAgo(id: string, days: number) {
  await db().document.update({
    where: { id },
    data: { deletedAt: new Date(Date.now() - days * DAY_MS) },
  });
}

describe.skipIf(!databaseAvailable)("trash", () => {
  it("keeps the date of the last change through the trash and back", async () => {
    const user = await createTestUser();
    const created = await createDocument(user.id, {
      markdown: "# Fechado",
      settings: DEFAULT_SETTINGS,
    });
    if (!created.ok) throw new Error(created.reason);
    const { id, updatedAt } = created.document;
    await trashDocument(user.id, id);
    expect((await listTrash(user.id))[0]?.updatedAt).toEqual(updatedAt);
    expect((await restoreDocument(user.id, id))?.updatedAt).toEqual(updatedAt);
    expect(await countTrash(user.id)).toBe(0);
  });

  it("lists what was deleted, most recently first, and restores it", async () => {
    const user = await createTestUser();
    const older = await trashed(user.id, "# Antiguo");
    const newer = await trashed(user.id, "# Reciente");
    await trashedDaysAgo(older.id, 2);

    const trash = await listTrash(user.id);
    expect(trash.map(({ title }) => title)).toEqual(["Reciente", "Antiguo"]);
    expect(trash[0]?.deletedAt).toBeInstanceOf(Date);

    expect(await restoreDocument(user.id, newer.id)).toMatchObject({
      id: newer.id,
      title: "Reciente",
    });
    expect(await getDocument(user.id, newer.id)).not.toBeNull();
    expect((await listTrash(user.id)).map(({ id }) => id)).toEqual([older.id]);
    // A document in use is not in the trash.
    expect(await restoreDocument(user.id, newer.id)).toBeNull();
  });

  it("puts a restored document back in its folder, or outside any if it is gone", async () => {
    const user = await createTestUser();
    const kept = await createFolder(user.id, "Se queda");
    const gone = await createFolder(user.id, "Se va");
    if (!kept.ok || !gone.ok) throw new Error("No se pudieron crear las carpetas.");
    const one = await trashed(user.id, "# Uno");
    const two = await trashed(user.id, "# Dos");
    await restoreDocument(user.id, one.id);
    await restoreDocument(user.id, two.id);
    await moveDocument(user.id, one.id, kept.folder.id);
    await moveDocument(user.id, two.id, gone.folder.id);
    await trashDocument(user.id, one.id);
    await trashDocument(user.id, two.id);
    await deleteFolder(user.id, gone.folder.id);

    expect((await restoreDocument(user.id, one.id))?.folderId).toBe(kept.folder.id);
    expect((await restoreDocument(user.id, two.id))?.folderId).toBeNull();
  });

  it("deletes for good, one document or the whole trash, with its images", async () => {
    const user = await createTestUser();
    const one = await trashed(user.id, "# Uno");
    await trashed(user.id, "# Dos");
    await trashed(user.id, "# Tres");
    // An image, added while the document was in use.
    await db().document.update({ where: { id: one.id }, data: { deletedAt: null } });
    await addAsset(user.id, one.id, "a.png", PNG);
    await trashDocument(user.id, one.id);

    expect(await deleteForever(user.id, one.id)).toBe(true);
    expect(await deleteForever(user.id, one.id)).toBe(false);
    expect(await db().asset.count({ where: { documentId: one.id } })).toBe(0);
    expect(await getAsset(user.id, one.id, "a.png")).toBeNull();
    expect(await emptyTrash(user.id)).toBe(2);
    expect(await listTrash(user.id)).toEqual([]);
  });

  it("deletes for good only what is in the trash, and only the owner's", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const created = await createDocument(owner.id, {
      markdown: "# En uso",
      settings: DEFAULT_SETTINGS,
    });
    if (!created.ok) throw new Error(created.reason);
    const inTrash = await trashed(owner.id, "# En la papelera");

    expect(await deleteForever(owner.id, created.document.id)).toBe(false);
    expect(await deleteForever(stranger.id, inTrash.id)).toBe(false);
    expect(await restoreDocument(stranger.id, inTrash.id)).toBeNull();
    expect(await emptyTrash(stranger.id)).toBe(0);
    expect(await listTrash(stranger.id)).toEqual([]);
    expect((await listTrash(owner.id)).map(({ id }) => id)).toEqual([inTrash.id]);
  });

  it("forgets what has been in the trash for more than thirty days", async () => {
    const user = await createTestUser();
    const expired = await trashed(user.id, "# Caducado");
    const recent = await trashed(user.id, "# Reciente");
    await trashedDaysAgo(expired.id, 31);
    await trashedDaysAgo(recent.id, 29);

    expect(await purgeExpiredTrash(user.id)).toBe(1);
    expect((await listTrash(user.id)).map(({ id }) => id)).toEqual([recent.id]);
    expect(await db().document.count({ where: { id: expired.id } })).toBe(0);
  });
});
