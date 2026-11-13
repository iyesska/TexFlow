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

/**
 * Formats both the browser and the LaTeX engine can read. SVG, GIF and WebP are left
 * out because LaTeX cannot include them.
 */
export const ASSET_TYPES = { "image/png": "png", "image/jpeg": "jpg" } as const;

export type AssetType = keyof typeof ASSET_TYPES;

export const ASSET_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxPerDocument: 50,
} as const;

export type AssetRejection =
  "unsupported-type" | "too-large" | "too-many" | "storage-failed";

const SIGNATURES: Readonly<Record<AssetType, readonly number[]>> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

/**
 * The real type of a file, read from its first bytes. A file's declared type and
 * extension are whatever its sender says; the content is what LaTeX will have to read.
 */
export function detectAssetType(head: Uint8Array): AssetType | null {
  for (const type of Object.keys(SIGNATURES) as AssetType[]) {
    if (SIGNATURES[type].every((byte, index) => head[index] === byte)) return type;
  }
  return null;
}

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
