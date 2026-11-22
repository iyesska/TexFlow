/**
 * The rules for a document's images, shared by the browser, which checks them when an
 * image is added, and the server, which checks them again before compiling.
 */

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

/** The only names an image can have: what `assetName` generates. Never a path. */
export const ASSET_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpg)$/;

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
export function fileStem(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  return base.replace(/\.[^.]*$/, "");
}

/**
 * A safe, unique file name for a new image: "Mi Diagrama (final).PNG" becomes
 * "mi-diagrama-final.png", or "mi-diagrama-final-2.png" if that is taken. The
 * extension follows the detected type, not the original name. Always matches
 * ASSET_NAME_PATTERN.
 */
export function assetName(
  originalName: string,
  type: AssetType,
  taken: ReadonlySet<string>,
): string {
  const base =
    fileStem(originalName)
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
