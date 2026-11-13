import { ASSET_TYPES, type AssetType } from "@/contracts/assets";

export {
  ASSET_LIMITS,
  ASSET_TYPES,
  detectAssetType,
  type AssetType,
} from "@/contracts/assets";

/** An image that belongs to a document, as it is persisted. */
export interface StoredAsset {
  readonly documentId: string;
  /** File name the Markdown refers to, e.g. "diagrama.png". Unique per document. */
  readonly name: string;
  readonly type: AssetType;
  readonly blob: Blob;
  /** ISO 8601 timestamp. */
  readonly addedAt: string;
}

export type AssetRejection =
  "unsupported-type" | "too-large" | "too-many" | "storage-failed";

const MAX_BASE_LENGTH = 40;

/** The file name without any directory or extension: "a/b/foto.final.png" → "foto.final". */
function stem(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  return base.replace(/\.[^.]*$/, "");
}

/**
 * A safe, unique file name for a new asset: "Mi Diagrama (final).PNG" becomes
 * "mi-diagrama-final.png", or "mi-diagrama-final-2.png" if that is taken. The
 * extension follows the detected type, not the original name.
 */
export function assetName(
  originalName: string,
  type: AssetType,
  taken: ReadonlySet<string>,
): string {
  const base =
    stem(originalName)
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, MAX_BASE_LENGTH)
      .replace(/^-+|-+$/g, "") || "imagen";
  const extension = ASSET_TYPES[type];

  let candidate = `${base}.${extension}`;
  for (let count = 2; taken.has(candidate); count++) {
    candidate = `${base}-${count}.${extension}`;
  }
  return candidate;
}

/** Alt text suggested for a new image, from its original file name. */
export function suggestedAltText(originalName: string): string {
  const text = stem(originalName).replace(/[-_]+/g, " ").replace(/[[\]]/g, "").trim();
  return text || "Imagen";
}
