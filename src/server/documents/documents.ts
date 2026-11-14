import "server-only";

import { ACCOUNT_LIMITS } from "@/contracts/documents";
import { deriveTitle } from "@/documents/title";
import { db, Prisma, TitleSource } from "@/server/db/client";
import { DEFAULT_SETTINGS } from "@/templates/catalog";
import {
  documentSettingsSchema,
  settingsKey,
  type DocumentSettings,
} from "@/templates/settings";

/**
 * The documents a user owns. Every function takes the owner's id, which comes from the
 * session and never from the request, and every query is scoped by it: a document of
 * someone else is indistinguishable from one that does not exist.
 */

export interface DocumentSummary {
  readonly id: string;
  readonly title: string;
  /** "manual" once the writer has named it; "content" follows the text's own title. */
  readonly titleSource: "content" | "manual";
  readonly folderId: string | null;
  readonly templateId: DocumentSettings["templateId"];
  readonly updatedAt: Date;
}

export interface DocumentRecord extends DocumentSummary {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  readonly revision: number;
  readonly createdAt: Date;
}

const FULL = {
  id: true,
  title: true,
  titleSource: true,
  folderId: true,
  markdown: true,
  settings: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
} as const;

type Row = Prisma.DocumentGetPayload<{ select: typeof FULL }>;

/** Stored settings are re-validated: rows written by older versions open with defaults. */
function readSettings(value: unknown): DocumentSettings {
  const parsed = documentSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

const titleSourceOf = (source: TitleSource) =>
  source === TitleSource.MANUAL ? "manual" : "content";

function toRecord(row: Row): DocumentRecord {
  const settings = readSettings(row.settings);
  return {
    id: row.id,
    title: row.title,
    titleSource: titleSourceOf(row.titleSource),
    folderId: row.folderId,
    templateId: settings.templateId,
    markdown: row.markdown,
    settings,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Whether a folder exists and belongs to this owner. */
async function ownsFolder(ownerId: string, folderId: string): Promise<boolean> {
  const folder = await db().folder.findFirst({
    where: { id: folderId, ownerId },
    select: { id: true },
  });
  return folder !== null;
}

export async function listDocuments(ownerId: string): Promise<DocumentSummary[]> {
  const rows = await db().document.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      titleSource: true,
      folderId: true,
      settings: true,
      updatedAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    titleSource: titleSourceOf(row.titleSource),
    folderId: row.folderId,
    templateId: readSettings(row.settings).templateId,
    updatedAt: row.updatedAt,
  }));
}

export async function getDocument(
  ownerId: string,
  id: string,
): Promise<DocumentRecord | null> {
  const row = await db().document.findFirst({ where: { id, ownerId }, select: FULL });
  return row ? toRecord(row) : null;
}

export interface NewDocument {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  readonly folderId?: string | null;
  /** A name for it; omitted, the title comes from the text. */
  readonly title?: string | null;
}

export type CreateResult =
  | { readonly ok: true; readonly document: DocumentRecord }
  | { readonly ok: false; readonly reason: "folder-not-found" | "too-many" };

/** Whether the owner can have one more document. */
async function hasRoomForDocument(ownerId: string): Promise<boolean> {
  const count = await db().document.count({ where: { ownerId } });
  return count < ACCOUNT_LIMITS.maxDocuments;
}

export async function createDocument(
  ownerId: string,
  input: NewDocument,
): Promise<CreateResult> {
  const folderId = input.folderId ?? null;
  if (folderId && !(await ownsFolder(ownerId, folderId))) {
    return { ok: false, reason: "folder-not-found" };
  }
  if (!(await hasRoomForDocument(ownerId))) return { ok: false, reason: "too-many" };
  const manual = Boolean(input.title?.trim());
  const row = await db().document.create({
    data: {
      ownerId,
      folderId,
      markdown: input.markdown,
      settings: input.settings,
      title: manual ? input.title!.trim() : deriveTitle(input.markdown),
      titleSource: manual ? TitleSource.MANUAL : TitleSource.CONTENT,
    },
    select: FULL,
  });
  return { ok: true, document: toRecord(row) };
}

export interface ContentChange {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  /** The revision the change was made on. */
  readonly baseRevision: number;
}

export type SaveResult =
  | {
      readonly ok: true;
      readonly revision: number;
      readonly title: string;
      readonly updatedAt: Date;
    }
  | { readonly ok: false; readonly reason: "not-found" }
  | { readonly ok: false; readonly reason: "conflict"; readonly revision: number };

/**
 * Saves new content, but only on top of the revision it was edited from. When another
 * tab or device saved first, the change is refused rather than overwriting that work.
 */
export async function saveDocumentContent(
  ownerId: string,
  id: string,
  change: ContentChange,
): Promise<SaveResult> {
  const current = await db().document.findFirst({
    where: { id, ownerId },
    select: { titleSource: true, title: true },
  });
  if (!current) return { ok: false, reason: "not-found" };

  const title =
    current.titleSource === TitleSource.MANUAL
      ? current.title
      : deriveTitle(change.markdown);
  const updated = await db().document.updateManyAndReturn({
    where: { id, ownerId, revision: change.baseRevision },
    data: {
      markdown: change.markdown,
      settings: change.settings,
      title,
      revision: { increment: 1 },
    },
    select: { revision: true, title: true, updatedAt: true },
  });
  const row = updated[0];
  if (row) return { ok: true, ...row };

  const latest = await db().document.findFirst({
    where: { id, ownerId },
    select: {
      revision: true,
      markdown: true,
      settings: true,
      title: true,
      updatedAt: true,
    },
  });
  if (!latest) return { ok: false, reason: "not-found" };
  // The same content saved twice, say by a page that was reloaded while its last save
  // was on the way, is no conflict: the server already has it.
  const alreadyStored =
    latest.markdown === change.markdown &&
    settingsKey(readSettings(latest.settings)) === settingsKey(change.settings);
  return alreadyStored
    ? {
        ok: true,
        revision: latest.revision,
        title: latest.title,
        updatedAt: latest.updatedAt,
      }
    : { ok: false, reason: "conflict", revision: latest.revision };
}

export type UpdateResult =
  | { readonly ok: true; readonly document: DocumentRecord }
  | { readonly ok: false; readonly reason: "not-found" | "folder-not-found" };

/** Names a document, or with null lets its title follow the text again. */
export async function renameDocument(
  ownerId: string,
  id: string,
  title: string | null,
): Promise<UpdateResult> {
  const document = await getDocument(ownerId, id);
  if (!document) return { ok: false, reason: "not-found" };
  const name = title?.trim();
  const row = await db().document.update({
    where: { id },
    data: name
      ? { title: name, titleSource: TitleSource.MANUAL }
      : { title: deriveTitle(document.markdown), titleSource: TitleSource.CONTENT },
    select: FULL,
  });
  return { ok: true, document: toRecord(row) };
}

/** Puts a document in one of the owner's folders, or with null outside any folder. */
export async function moveDocument(
  ownerId: string,
  id: string,
  folderId: string | null,
): Promise<UpdateResult> {
  if (!(await getDocument(ownerId, id))) return { ok: false, reason: "not-found" };
  if (folderId && !(await ownsFolder(ownerId, folderId))) {
    return { ok: false, reason: "folder-not-found" };
  }
  const row = await db().document.update({
    where: { id },
    data: { folderId },
    select: FULL,
  });
  return { ok: true, document: toRecord(row) };
}

const COPY_SUFFIX = " (copia)";

export type DuplicateResult =
  | { readonly ok: true; readonly document: DocumentRecord }
  | { readonly ok: false; readonly reason: "not-found" | "too-many" };

/** A copy with the same text, design and images, named as a copy, in the same folder. */
export async function duplicateDocument(
  ownerId: string,
  id: string,
): Promise<DuplicateResult> {
  if (!(await hasRoomForDocument(ownerId))) return { ok: false, reason: "too-many" };
  const document = await db().$transaction(async (tx) => {
    const original = await tx.document.findFirst({
      where: { id, ownerId },
      select: {
        ...FULL,
        assets: { select: { name: true, type: true, size: true, data: true } },
      },
    });
    if (!original) return null;
    const row = await tx.document.create({
      data: {
        ownerId,
        folderId: original.folderId,
        markdown: original.markdown,
        settings: original.settings ?? Prisma.JsonNull,
        title: `${original.title}${COPY_SUFFIX}`,
        titleSource: TitleSource.MANUAL,
        assets: { create: original.assets },
      },
      select: FULL,
    });
    return toRecord(row);
  });
  return document ? { ok: true, document } : { ok: false, reason: "not-found" };
}

export async function deleteDocument(ownerId: string, id: string): Promise<boolean> {
  const { count } = await db().document.deleteMany({ where: { id, ownerId } });
  return count > 0;
}
