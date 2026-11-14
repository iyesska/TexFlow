import { z } from "zod";

import { assetSchema, ASSET_UPLOAD_FIELD } from "@/contracts/documents";
import { callApi } from "@/lib/api-client";

import type { AssetStore } from "./asset-library";

const uploadedSchema = z.object({ asset: assetSchema });

/** The images of a document, kept by the API at /api/documents/:id/assets. */
export function createApiAssetStore(documentId: string): AssetStore {
  const base = `/api/documents/${documentId}/assets`;
  const url = (name: string) => `${base}/${encodeURIComponent(name)}`;

  return {
    url,

    async upload(file) {
      const body = new FormData();
      body.set(ASSET_UPLOAD_FIELD, file);
      const result = await callApi(base, { method: "POST", body }, uploadedSchema);
      if (result.ok && result.value) {
        return { ok: true, name: result.value.asset.name, asset: result.value.asset };
      }
      if (result.ok) return { ok: false, reason: "upload-failed" };
      switch (result.code) {
        case "unsupported-type":
          return { ok: false, reason: "unsupported-type" };
        case "too-large":
          return { ok: false, reason: "too-large" };
        case "too-many":
          return { ok: false, reason: "too-many" };
        default:
          return { ok: false, reason: "upload-failed", message: result.message };
      }
    },

    async download(name) {
      try {
        const response = await fetch(url(name));
        return response.ok ? await response.blob() : null;
      } catch {
        return null;
      }
    },
  };
}
