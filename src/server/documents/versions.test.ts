// @vitest-environment node
import { describe, expect, it } from "vitest";

import { db, VersionKind } from "@/server/db/client";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { DEFAULT_SETTINGS, templateSettings } from "@/templates/catalog";

import {
  createDocument,
  getDocument,
  renameDocument,
  saveDocumentContent,
} from "./documents";
import {
  getVersion,
  keepNamedVersion,
  listVersions,
  MAX_AUTO_VERSIONS,
  restoreVersion,
  VERSION_INTERVAL_MS,
} from "./versions";

async function newDocument(ownerId: string, markdown = "# Primera\n\nTexto.") {
  const result = await createDocument(ownerId, { markdown, settings: DEFAULT_SETTINGS });
  if (!result.ok) throw new Error(result.reason);
  return result.document;
}

async function save(ownerId: string, id: string, markdown: string, baseRevision: number) {
  const result = await saveDocumentContent(ownerId, id, {
    markdown,
    settings: DEFAULT_SETTINGS,
    baseRevision,
  });
  if (!result.ok) throw new Error(result.reason);
  return result.revision;
}

/** Makes every version of the document look older than the interval between them. */
async function age(documentId: string) {
  await db().documentVersion.updateMany({
    where: { documentId },
    data: { createdAt: new Date(Date.now() - VERSION_INTERVAL_MS - 1000) },
  });
}

describe.skipIf(!databaseAvailable)("version history", () => {
  it("keeps the state before a save, at most once every ten minutes", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);

    await save(user.id, document.id, "# Segunda", 0);
    await save(user.id, document.id, "# Tercera", 1);
    let versions = await listVersions(user.id, document.id);
    expect(
      versions?.map(({ title, kind, revision }) => ({ title, kind, revision })),
    ).toEqual([{ title: "Primera", kind: "auto", revision: 0 }]);

    await age(document.id);
    await save(user.id, document.id, "# Cuarta", 2);
    versions = await listVersions(user.id, document.id);
    expect(versions?.map(({ title }) => title)).toEqual(["Tercera", "Primera"]);
  });

  it("keeps a named version of the stored state", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    const named = await keepNamedVersion(user.id, document.id, "  Entrega 1 ");
    expect(named).toMatchObject({ kind: "named", label: "Entrega 1", title: "Primera" });

    const version = await getVersion(user.id, document.id, named!.id);
    expect(version).toMatchObject({ markdown: "# Primera\n\nTexto.", revision: 0 });
    expect(version?.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps work that never reached the server as a named version", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    const unsaved = {
      markdown: "# Sin guardar\n\nTexto de esta pestaña.",
      settings: templateSettings("thesis"),
      bibliography: "@book{a, title={A}}",
    };
    const named = await keepNamedVersion(user.id, document.id, "Mis cambios", unsaved);
    expect(named).toMatchObject({ kind: "named", title: "Sin guardar" });
    expect(await getVersion(user.id, document.id, named!.id)).toMatchObject(unsaved);
    // The document itself is untouched.
    expect(await getDocument(user.id, document.id)).toMatchObject({
      markdown: "# Primera\n\nTexto.",
      revision: 0,
    });
  });

  it("restores a version, keeping the state it replaces", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    await saveDocumentContent(user.id, document.id, {
      markdown: "# Segunda",
      settings: templateSettings("thesis"),
      bibliography: "@book{a, title={A}}",
      baseRevision: 0,
    });
    const [first] = (await listVersions(user.id, document.id))!;

    const restored = await restoreVersion(user.id, document.id, first!.id, 1);
    if (!restored.ok) throw new Error(restored.reason);
    expect(restored.document).toMatchObject({
      markdown: "# Primera\n\nTexto.",
      title: "Primera",
      bibliography: "",
      revision: 2,
    });
    expect(restored.document.settings.templateId).toBe("academic-paper");

    const versions = await listVersions(user.id, document.id);
    expect(versions?.[0]).toMatchObject({ kind: "before-restore", title: "Segunda" });
    expect(restored.kept).toEqual(versions?.[0]);
  });

  it("refuses to restore over a newer revision, and keeps a name given by hand", async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    await save(user.id, document.id, "# Segunda", 0);
    await renameDocument(user.id, document.id, "Mi nombre");
    const [first] = (await listVersions(user.id, document.id))!;

    expect(await restoreVersion(user.id, document.id, first!.id, 0)).toEqual({
      ok: false,
      reason: "conflict",
      revision: 1,
    });
    const restored = await restoreVersion(user.id, document.id, first!.id, 1);
    expect(restored.ok && restored.document.title).toBe("Mi nombre");
  });

  it("keeps each history to its owner", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const document = await newDocument(owner.id);
    const named = await keepNamedVersion(owner.id, document.id, "Mía");

    expect(await listVersions(stranger.id, document.id)).toBeNull();
    expect(await getVersion(stranger.id, document.id, named!.id)).toBeNull();
    expect(await keepNamedVersion(stranger.id, document.id, "Robada")).toBeNull();
    expect(await restoreVersion(stranger.id, document.id, named!.id, 0)).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect((await getDocument(owner.id, document.id))?.revision).toBe(0);
  });

  it(`keeps the newest ${MAX_AUTO_VERSIONS} automatic versions, and every named one`, async () => {
    const user = await createTestUser();
    const document = await newDocument(user.id);
    await keepNamedVersion(user.id, document.id, "Hito");
    const old = new Date(Date.now() - 2 * VERSION_INTERVAL_MS);
    await db().documentVersion.createMany({
      data: Array.from({ length: MAX_AUTO_VERSIONS }, (_, index) => ({
        documentId: document.id,
        kind: VersionKind.AUTO,
        title: `Vieja ${index}`,
        markdown: "x",
        settings: DEFAULT_SETTINGS,
        revision: 0,
        createdAt: new Date(old.getTime() - index * 1000),
      })),
    });
    // Only the named version is recent; make it old too, so the save keeps a version.
    await db().documentVersion.updateMany({
      where: { documentId: document.id, kind: VersionKind.NAMED },
      data: { createdAt: old },
    });
    await save(user.id, document.id, "# Nueva", 0);

    const versions = (await listVersions(user.id, document.id))!;
    expect(versions.filter(({ kind }) => kind === "auto")).toHaveLength(
      MAX_AUTO_VERSIONS,
    );
    expect(versions.some(({ label }) => label === "Hito")).toBe(true);
    expect(versions.some(({ title }) => title === `Vieja ${MAX_AUTO_VERSIONS - 1}`)).toBe(
      false,
    );
  });
});
