import { fileStem } from "@/contracts/assets";

export {
  ASSET_LIMITS,
  ASSET_TYPES,
  assetName,
  detectAssetType,
  type AssetType,
} from "@/contracts/assets";

/** Why an image could not be added. "upload-failed" carries the server's reason. */
export type AssetRejection =
  "unsupported-type" | "too-large" | "too-many" | "upload-failed";

/** Alt text suggested for a new image, from its original file name. */
export function suggestedAltText(originalName: string): string {
  const text = fileStem(originalName).replace(/[-_]+/g, " ").replace(/[[\]]/g, "").trim();
  return text || "Imagen";
}
