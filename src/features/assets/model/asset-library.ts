import type { AssetDto } from "@/contracts/documents";

import {
  ASSET_LIMITS,
  detectAssetType,
  type AssetRejection,
  type AssetType,
} from "./asset";

/** An image of the open document, and where the browser loads it from. */
export interface AssetEntry {
  readonly name: string;
  readonly type: AssetType;
  readonly size: number;
  readonly url: string;
}

export type AssetMap = ReadonlyMap<string, AssetEntry>;

export type AddAssetResult =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: AssetRejection; readonly message?: string };

/** Where a document's images are kept: the API, or a fake in tests. */
export interface AssetStore {
  /** The URL the image is served from. */
  url(name: string): string;
  /** Stores an image; the store chooses its name. */
  upload(file: File): Promise<AddAssetResult & { readonly asset?: AssetDto }>;
  /** The image's bytes, or null when it cannot be read. */
  download(name: string): Promise<Blob | null>;
}

export interface AssetLibrary {
  getSnapshot(): AssetMap;
  subscribe(listener: () => void): () => void;
  /** Checks, stores and names a new image. */
  add(file: File): Promise<AddAssetResult>;
  /** An image's bytes, for exports. */
  read(name: string): Promise<Blob | null>;
}

const SIGNATURE_LENGTH = 8;

/**
 * The images of the open document. Their list is kept in memory so the preview can
 * resolve them synchronously; their bytes stay on the server until something needs
 * them. Framework-free, like the document session.
 */
export function createAssetLibrary(options: {
  readonly store: AssetStore;
  readonly initial: readonly AssetDto[];
}): AssetLibrary {
  const { store } = options;
  const listeners = new Set<() => void>();
  const entry = (asset: AssetDto): [string, AssetEntry] => [
    asset.name,
    { ...asset, url: store.url(asset.name) },
  ];
  let assets: AssetMap = new Map(options.initial.map(entry));

  return {
    getSnapshot: () => assets,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async add(file) {
      // The server checks all of this again; checking here answers at once.
      if (file.size > ASSET_LIMITS.maxBytes) return { ok: false, reason: "too-large" };
      if (assets.size >= ASSET_LIMITS.maxPerDocument)
        return { ok: false, reason: "too-many" };
      const head = new Uint8Array(await file.slice(0, SIGNATURE_LENGTH).arrayBuffer());
      if (detectAssetType(head) === null)
        return { ok: false, reason: "unsupported-type" };

      const result = await store.upload(file);
      if (!result.ok) return result;
      if (result.asset) {
        assets = new Map(assets).set(...entry(result.asset));
        listeners.forEach((listener) => listener());
      }
      return { ok: true, name: result.name };
    },

    read: (name) => (assets.has(name) ? store.download(name) : Promise.resolve(null)),
  };
}
