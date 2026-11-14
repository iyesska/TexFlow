import "server-only";

import {
  ASSET_LIMITS,
  ASSET_NAME_PATTERN,
  assetName,
  detectAssetType,
  type AssetType,
} from "@/contracts/assets";
import { imagesUsedBy } from "@/documents/used-images";
import { db, Prisma } from "@/server/db/client";

/**
 * The images of a user's documents. Access goes through the document: an image is
 * reachable only by the owner of the document it belongs to.
 */

export interface AssetInfo {
  readonly name: string;
  readonly type: AssetType;
  readonly size: number;
}

export type AddAssetResult =
  | { readonly ok: true; readonly asset: AssetInfo }
  | {
      readonly ok: false;
      readonly reason: "not-found" | "unsupported-type" | "too-large" | "too-many";
    };

async function ownsDocument(ownerId: string, documentId: string): Promise<boolean> {
  const document = await db().document.findFirst({
    where: { id: documentId, ownerId },
    select: { id: true },
  });
  return document !== null;
}

/** The document's images, or null when the document is not the owner's. */
export async function listAssets(
  ownerId: string,
  documentId: string,
): Promise<AssetInfo[] | null> {
  if (!(await ownsDocument(ownerId, documentId))) return null;
  const rows = await db().asset.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    select: { name: true, type: true, size: true },
  });
  return rows.flatMap((row) => {
    const type = row.type === "image/png" || row.type === "image/jpeg" ? row.type : null;
    return type ? [{ name: row.name, type, size: row.size }] : [];
  });
}

/**
 * Stores an image. Its type is read from its content, never from the name or the
 * declared type, and the server chooses its name.
 */
export async function addAsset(
  ownerId: string,
  documentId: string,
  originalName: string,
  data: Uint8Array,
): Promise<AddAssetResult> {
  if (!(await ownsDocument(ownerId, documentId)))
    return { ok: false, reason: "not-found" };
  if (data.byteLength > ASSET_LIMITS.maxBytes) return { ok: false, reason: "too-large" };
  const type = detectAssetType(data.subarray(0, 8));
  if (type === null) return { ok: false, reason: "unsupported-type" };

  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await db().asset.findMany({
      where: { documentId },
      select: { name: true },
    });
    if (existing.length >= ASSET_LIMITS.maxPerDocument)
      return { ok: false, reason: "too-many" };
    const name = assetName(
      originalName,
      type,
      new Set(existing.map((asset) => asset.name)),
    );
    try {
      await db().asset.create({
        data: { documentId, name, type, size: data.byteLength, data: Buffer.from(data) },
      });
      return { ok: true, asset: { name, type, size: data.byteLength } };
    } catch (error) {
      // Another upload took the same name a moment earlier: pick the next one.
      const taken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!taken) throw error;
    }
  }
  throw new Error("Could not find a free name for the image.");
}

/**
 * The stored images the Markdown refers to, with their bytes, for a compile. Null when
 * the document is not the owner's.
 */
export async function imagesForCompile(
  ownerId: string,
  documentId: string,
  markdown: string,
): Promise<{ readonly name: string; readonly data: Uint8Array }[] | null> {
  const assets = await listAssets(ownerId, documentId);
  if (assets === null) return null;
  const names = imagesUsedBy(markdown, assets).map(({ name }) => name);
  if (names.length === 0) return [];
  return db().asset.findMany({
    where: { documentId, name: { in: names } },
    select: { name: true, data: true },
  });
}

export interface StoredImage {
  readonly type: AssetType;
  /**
   * Identifies the content. Images are never changed, only added and deleted, so the
   * moment one was stored tells it apart from any other that later takes its name.
   */
  readonly version: string;
}

/**
 * An image's bytes, or null when it or its document is not the owner's. With
 * `knownVersion`, the bytes are left out when that is still the stored version.
 */
export async function getAsset(
  ownerId: string,
  documentId: string,
  name: string,
  knownVersion?: string,
): Promise<(StoredImage & { readonly data: Uint8Array | null }) | null> {
  if (!ASSET_NAME_PATTERN.test(name)) return null;
  const where = { documentId, name, document: { ownerId } };
  const info = await db().asset.findFirst({
    where,
    select: { type: true, size: true, createdAt: true },
  });
  if (!info || (info.type !== "image/png" && info.type !== "image/jpeg")) return null;
  const version = `${info.createdAt.getTime().toString(36)}-${info.size.toString(36)}`;
  if (version === knownVersion) return { type: info.type, version, data: null };

  const row = await db().asset.findFirst({ where, select: { data: true } });
  return row ? { type: info.type, version, data: row.data } : null;
}

export async function deleteAsset(
  ownerId: string,
  documentId: string,
  name: string,
): Promise<boolean> {
  const { count } = await db().asset.deleteMany({
    where: { documentId, name, document: { ownerId } },
  });
  return count > 0;
}
