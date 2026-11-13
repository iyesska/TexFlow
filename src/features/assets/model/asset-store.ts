import type { StoredAsset } from "./asset";

/**
 * Where a document's images are kept. Today that is the browser; from phase 7 the API
 * implements the same interface.
 */
export interface AssetStore {
  list(documentId: string): Promise<StoredAsset[]>;
  put(asset: StoredAsset): Promise<void>;
}

const DATABASE = "texflow";
const STORE = "assets";
const BY_DOCUMENT = "by-document";

function request<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(source.error);
  });
}

function open(factory: IDBFactory): Promise<IDBDatabase> {
  const opening = factory.open(DATABASE, 1);
  opening.onupgradeneeded = () => {
    const store = opening.result.createObjectStore(STORE, {
      keyPath: ["documentId", "name"],
    });
    store.createIndex(BY_DOCUMENT, "documentId");
  };
  return request(opening);
}

/**
 * A store backed by IndexedDB, which can hold binary files. Takes a getter because
 * `indexedDB` only exists in the browser.
 */
export function createIndexedDbAssetStore(getFactory: () => IDBFactory): AssetStore {
  let database: Promise<IDBDatabase> | undefined;
  const connect = () => (database ??= open(getFactory()));

  return {
    async list(documentId) {
      const db = await connect();
      const index = db
        .transaction(STORE, "readonly")
        .objectStore(STORE)
        .index(BY_DOCUMENT);
      return request(index.getAll(documentId) as IDBRequest<StoredAsset[]>);
    },
    async put(asset) {
      const db = await connect();
      await request(db.transaction(STORE, "readwrite").objectStore(STORE).put(asset));
    },
  };
}
