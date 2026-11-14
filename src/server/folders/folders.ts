import "server-only";

import { ACCOUNT_LIMITS } from "@/contracts/documents";
import { db, Prisma } from "@/server/db/client";

/** The folders a user owns, scoped by owner like documents. One level: no nesting. */

export interface FolderSummary {
  readonly id: string;
  readonly name: string;
  readonly documentCount: number;
}

export type FolderResult =
  | { readonly ok: true; readonly folder: FolderSummary }
  | { readonly ok: false; readonly reason: "name-taken" | "not-found" | "too-many" };

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export async function listFolders(ownerId: string): Promise<FolderSummary[]> {
  const rows = await db().folder.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { documents: true } } },
  });
  return rows.map(({ id, name, _count }) => ({
    id,
    name,
    documentCount: _count.documents,
  }));
}

export async function createFolder(ownerId: string, name: string): Promise<FolderResult> {
  const count = await db().folder.count({ where: { ownerId } });
  if (count >= ACCOUNT_LIMITS.maxFolders) return { ok: false, reason: "too-many" };
  try {
    const row = await db().folder.create({
      data: { ownerId, name: name.trim() },
      select: { id: true, name: true },
    });
    return { ok: true, folder: { ...row, documentCount: 0 } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "name-taken" };
    throw error;
  }
}

export async function renameFolder(
  ownerId: string,
  id: string,
  name: string,
): Promise<FolderResult> {
  try {
    const { count } = await db().folder.updateMany({
      where: { id, ownerId },
      data: { name: name.trim() },
    });
    if (count === 0) return { ok: false, reason: "not-found" };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "name-taken" };
    throw error;
  }
  const row = await db().folder.findFirstOrThrow({
    where: { id, ownerId },
    select: { id: true, name: true, _count: { select: { documents: true } } },
  });
  return {
    ok: true,
    folder: { id: row.id, name: row.name, documentCount: row._count.documents },
  };
}

/** Deletes a folder. Its documents are kept, outside any folder. */
export async function deleteFolder(ownerId: string, id: string): Promise<boolean> {
  const { count } = await db().folder.deleteMany({ where: { id, ownerId } });
  return count > 0;
}
