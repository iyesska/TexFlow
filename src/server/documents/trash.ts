import "server-only";

import { TRASH_RETENTION_DAYS } from "@/contracts/documents";
import { db } from "@/server/db/client";

import { SUMMARY, toSummary, type DocumentSummary } from "./documents";

/**
 * The trash: deleting a document moves it here (see trashDocument), where it waits
 * TRASH_RETENTION_DAYS to be restored before it is deleted for good, with its images
 * and its history. Like everything else, each function is scoped by the owner.
 */

export interface TrashedDocument extends DocumentSummary {
  readonly deletedAt: Date;
}

const IN_TRASH = { deletedAt: { not: null } } as const;
const DAY_MS = 86_400_000;

/** Deletes for good what has been in the owner's trash longer than it is kept. */
export async function purgeExpiredTrash(
  ownerId: string,
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * DAY_MS);
  const { count } = await db().document.deleteMany({
    where: { ownerId, deletedAt: { lt: cutoff } },
  });
  return count;
}

/** The owner's trash, most recently deleted first, once the expired is gone. */
export async function listTrash(
  ownerId: string,
  now = new Date(),
): Promise<TrashedDocument[]> {
  await purgeExpiredTrash(ownerId, now);
  const rows = await db().document.findMany({
    where: { ownerId, ...IN_TRASH },
    orderBy: { deletedAt: "desc" },
    select: { ...SUMMARY, deletedAt: true },
  });
  return rows.map((row) => ({ ...toSummary(row), deletedAt: row.deletedAt ?? now }));
}

/**
 * Takes a document out of the trash, back to its folder if that still exists, and
 * to its place in the list: like the move to the trash, it keeps the date of its
 * last change.
 */
export async function restoreDocument(
  ownerId: string,
  id: string,
): Promise<DocumentSummary | null> {
  const count = await db().$executeRaw`
    UPDATE documents SET deleted_at = NULL
    WHERE id = ${id} AND owner_id = ${ownerId} AND deleted_at IS NOT NULL`;
  if (count === 0) return null;
  const row = await db().document.findFirst({ where: { id, ownerId }, select: SUMMARY });
  return row ? toSummary(row) : null;
}

/** How many documents the owner's trash holds that have not outstayed it. */
export async function countTrash(ownerId: string, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * DAY_MS);
  return db().document.count({ where: { ownerId, deletedAt: { gte: cutoff } } });
}

/** Deletes a document in the trash for good. False when the trash has no such one. */
export async function deleteForever(ownerId: string, id: string): Promise<boolean> {
  const { count } = await db().document.deleteMany({
    where: { id, ownerId, ...IN_TRASH },
  });
  return count > 0;
}

/** Deletes everything in the owner's trash for good; resolves to how many. */
export async function emptyTrash(ownerId: string): Promise<number> {
  const { count } = await db().document.deleteMany({ where: { ownerId, ...IN_TRASH } });
  return count;
}
