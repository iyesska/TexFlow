import {
  ASSET_LIMITS,
  assetName,
  detectAssetType,
  type AssetRejection,
  type AssetType,
} from "./asset";
import type { AssetStore } from "./asset-store";

/** An image ready to be shown: its bytes plus a URL the browser can load. */
export interface AssetEntry {
  readonly name: string;
  readonly type: AssetType;
  readonly blob: Blob;
  /** An object URL, valid until the library is disposed. */
  readonly url: string;
}

export type AssetMap = ReadonlyMap<string, AssetEntry>;

export type AddAssetResult =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: AssetRejection };

export interface AssetLibrary {
  getSnapshot(): AssetMap;
  subscribe(listener: () => void): () => void;
  /** Reads the document's stored images. */
  load(): Promise<void>;
  /** Validates, names and stores a new image. */
  add(file: File): Promise<AddAssetResult>;
  /** Releases the object URLs. */
  dispose(): void;
}

interface AssetLibraryOptions {
  readonly documentId: string;
  readonly store: AssetStore;
  /** `URL.createObjectURL` and `URL.revokeObjectURL`, injectable for tests. */
  readonly urls?: {
    create(blob: Blob): string;
    revoke(url: string): void;
  };
  readonly now?: () => Date;
}

const browserUrls = {
  create: (blob: Blob) => URL.createObjectURL(blob),
  revoke: (url: string) => URL.revokeObjectURL(url),
};

const SIGNATURE_LENGTH = 8;

/**
 * The images of the open document, loaded once and kept in memory so the preview can
 * resolve them synchronously. Framework-free, like the document session.
 */
export function createAssetLibrary(options: AssetLibraryOptions): AssetLibrary {
  const { documentId, store, urls = browserUrls, now = () => new Date() } = options;
  const listeners = new Set<() => void>();
  let assets: AssetMap = new Map();

  const publish = (next: AssetMap) => {
    assets = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => assets,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async load() {
      let stored;
      try {
        stored = await store.list(documentId);
      } catch {
        // Unreadable storage is treated as an empty one: images can still be added.
        return;
      }
      const next = new Map(assets);
      for (const { name, type, blob } of stored) {
        if (!next.has(name)) next.set(name, { name, type, blob, url: urls.create(blob) });
      }
      publish(next);
    },

    async add(file) {
      if (file.size > ASSET_LIMITS.maxBytes) return { ok: false, reason: "too-large" };
      if (assets.size >= ASSET_LIMITS.maxPerDocument)
        return { ok: false, reason: "too-many" };

      const head = new Uint8Array(await file.slice(0, SIGNATURE_LENGTH).arrayBuffer());
      const type = detectAssetType(head);
      if (type === null) return { ok: false, reason: "unsupported-type" };

      const name = assetName(file.name, type, new Set(assets.keys()));
      // Re-wrap the bytes with the detected type: the declared one is not trusted.
      const blob = new Blob([file], { type });
      try {
        await store.put({ documentId, name, type, blob, addedAt: now().toISOString() });
      } catch {
        return { ok: false, reason: "storage-failed" };
      }
      publish(new Map(assets).set(name, { name, type, blob, url: urls.create(blob) }));
      return { ok: true, name };
    },

    dispose() {
      for (const { url } of assets.values()) urls.revoke(url);
      listeners.clear();
    },
  };
}
