import "server-only";

import type { VersionContent } from "@/contracts/documents";
import { deriveTitle } from "@/documents/title";
import { db, Prisma, TitleSource, VersionKind } from "@/server/db/client";
import type { DocumentSettings } from "@/templates/settings";

import type { DocumentRecord } from "./documents";
import { readSettings } from "./stored-settings";

/**
 * A document's history. While it is edited, the state before a save is kept as a
 * version when no version is younger than ten minutes: one version per pause or per
 * stretch of writing, rather than one per keystroke. The writer can also keep a
 * version with a name, and restoring keeps the state it replaces.
 */

/** No two automatic versions closer together than this. */
export const VERSION_INTERVAL_MS = 10 * 60 * 1000;

/** Automatic versions kept per document; named ones are always kept. */
export const MAX_AUTO_VERSIONS = 100;

type Transaction = Prisma.TransactionClient;

export type VersionKindName = "auto" | "named" | "before-restore";

const KIND_NAMES: Readonly<Record<VersionKind, VersionKindName>> = {
  [VersionKind.AUTO]: "auto",
  [VersionKind.NAMED]: "named",
  [VersionKind.BEFORE_RESTORE]: "before-restore",
};

export interface VersionSummary {
  readonly id: string;
  readonly kind: VersionKindName;
  readonly label: string | null;
  readonly title: string;
  readonly revision: number;
  readonly createdAt: Date;
}

export interface VersionRecord extends VersionSummary {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  readonly bibliography: string;
}

const SUMMARY = {
  id: true,
  kind: true,
  label: true,
  title: true,
  revision: true,
  createdAt: true,
} as const;

const toSummary = (
  row: Prisma.DocumentVersionGetPayload<{ select: typeof SUMMARY }>,
) => ({
  ...row,
  kind: KIND_NAMES[row.kind],
});

/**
 * Keeps the document's stored state as a version of `kind`, or `content` in its
 * place: work that never reached the server.
 */
async function keepVersion(
  tx: Transaction,
  documentId: string,
  kind: VersionKind,
  label: string | null = null,
  content?: VersionContent,
): Promise<VersionSummary | null> {
  const document = await tx.document.findUnique({
    where: { id: documentId },
    select: {
      title: true,
      titleSource: true,
      markdown: true,
      settings: true,
      bibliography: true,
      revision: true,
    },
  });
  if (!document) return null;
  const kept = content
    ? {
        title:
          document.titleSource === TitleSource.MANUAL
            ? document.title
            : deriveTitle(content.markdown),
        markdown: content.markdown,
        settings: content.settings,
        bibliography: content.bibliography,
      }
    : {
        title: document.title,
        markdown: document.markdown,
        settings: document.settings ?? Prisma.JsonNull,
        bibliography: document.bibliography,
      };
  const row = await tx.documentVersion.create({
    data: { documentId, kind, label, ...kept, revision: document.revision },
    select: SUMMARY,
  });
  if (kind === VersionKind.AUTO) {
    const old = await tx.documentVersion.findMany({
      where: { documentId, kind: VersionKind.AUTO },
      orderBy: { createdAt: "desc" },
      skip: MAX_AUTO_VERSIONS,
      select: { id: true },
    });
    if (old.length > 0) {
      await tx.documentVersion.deleteMany({
        where: { id: { in: old.map(({ id }) => id) } },
      });
    }
  }
  return toSummary(row);
}

/**
 * Before a save: keeps the stored state as an automatic version unless one was kept
 * in the last ten minutes. The caller has checked the document is the owner's.
 */
export async function keepVersionIfDue(
  tx: Transaction,
  documentId: string,
  now = new Date(),
) {
  const latest = await tx.documentVersion.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (latest && now.getTime() - latest.createdAt.getTime() < VERSION_INTERVAL_MS) return;
  await keepVersion(tx, documentId, VersionKind.AUTO);
}

async function ownsDocument(tx: Transaction, ownerId: string, documentId: string) {
  const document = await tx.document.findFirst({
    where: { id: documentId, ownerId },
    select: { id: true },
  });
  return document !== null;
}

/** The document's versions, newest first, without their content; null if not the owner's. */
export async function listVersions(
  ownerId: string,
  documentId: string,
): Promise<VersionSummary[] | null> {
  if (!(await ownsDocument(db(), ownerId, documentId))) return null;
  const rows = await db().documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: SUMMARY,
  });
  return rows.map(toSummary);
}

/** One version with its content, or null when it or its document is not the owner's. */
export async function getVersion(
  ownerId: string,
  documentId: string,
  versionId: string,
): Promise<VersionRecord | null> {
  const row = await db().documentVersion.findFirst({
    where: { id: versionId, documentId, document: { ownerId } },
    select: { ...SUMMARY, markdown: true, settings: true, bibliography: true },
  });
  if (!row) return null;
  return {
    ...toSummary(row),
    markdown: row.markdown,
    settings: readSettings(row.settings),
    bibliography: row.bibliography,
  };
}

/**
 * Keeps the document as it is stored now with a name, or `content` in its place.
 * Null if the document is not the owner's.
 */
export async function keepNamedVersion(
  ownerId: string,
  documentId: string,
  label: string,
  content?: VersionContent,
): Promise<VersionSummary | null> {
  return db().$transaction(async (tx) => {
    if (!(await ownsDocument(tx, ownerId, documentId))) return null;
    return keepVersion(tx, documentId, VersionKind.NAMED, label.trim(), content);
  });
}

export type RestoreResult =
  | {
      readonly ok: true;
      readonly document: DocumentRecord;
      /** The state the restore replaced, kept as a version: restoring it undoes this. */
      readonly kept: VersionSummary;
    }
  | { readonly ok: false; readonly reason: "not-found" }
  | { readonly ok: false; readonly reason: "conflict"; readonly revision: number };

/**
 * Puts a version's content back, on top of the revision the writer was looking at.
 * The state it replaces is kept first, so a restore can itself be undone. The title
 * follows the restored text unless the writer named the document.
 */
export async function restoreVersion(
  ownerId: string,
  documentId: string,
  versionId: string,
  baseRevision: number,
): Promise<RestoreResult> {
  return db().$transaction(async (tx) => {
    const document = await tx.document.findFirst({
      where: { id: documentId, ownerId },
      select: { revision: true, titleSource: true, title: true },
    });
    const version = await tx.documentVersion.findFirst({
      where: { id: versionId, documentId },
      select: { markdown: true, settings: true, bibliography: true },
    });
    if (!document || !version) return { ok: false, reason: "not-found" } as const;
    if (document.revision !== baseRevision) {
      return { ok: false, reason: "conflict", revision: document.revision } as const;
    }

    const kept = await keepVersion(tx, documentId, VersionKind.BEFORE_RESTORE);
    const row = await tx.document.update({
      where: { id: documentId },
      data: {
        markdown: version.markdown,
        settings: version.settings ?? Prisma.JsonNull,
        bibliography: version.bibliography,
        title:
          document.titleSource === TitleSource.MANUAL
            ? document.title
            : deriveTitle(version.markdown),
        revision: { increment: 1 },
      },
      select: { id: true },
    });
    const restored = await readRecord(tx, row.id);
    return restored && kept
      ? ({ ok: true, document: restored, kept } as const)
      : ({ ok: false, reason: "not-found" } as const);
  });
}

async function readRecord(tx: Transaction, id: string): Promise<DocumentRecord | null> {
  const row = await tx.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      titleSource: true,
      folderId: true,
      markdown: true,
      settings: true,
      bibliography: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!row) return null;
  const settings = readSettings(row.settings);
  return {
    id: row.id,
    title: row.title,
    titleSource: row.titleSource === TitleSource.MANUAL ? "manual" : "content",
    folderId: row.folderId,
    templateId: settings.templateId,
    markdown: row.markdown,
    settings,
    bibliography: row.bibliography,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
