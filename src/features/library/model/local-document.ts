import { z } from "zod";

import { detectAssetType, type AssetType } from "@/contracts/assets";
import { SAMPLE_DOCUMENT } from "@/documents/sample-document";
import { DEFAULT_SETTINGS } from "@/templates/catalog";
import { documentSettingsSchema, type DocumentSettings } from "@/templates/settings";

/**
 * The document a browser kept before accounts existed: its text in localStorage and
 * its images in IndexedDB. The library offers to import it once, then forgets it.
 */

const DOCUMENT_KEY = "texflow:document:local";
const DOCUMENT_ID = "local";
const DATABASE = "texflow";
const STORE = "assets";
const BY_DOCUMENT = "by-document";

export interface LocalDocument {
  readonly markdown: string;
  readonly settings: DocumentSettings;
}

export interface LocalImage {
  readonly name: string;
  readonly type: AssetType;
  readonly blob: Blob;
}

const storedSchema = z.object({ markdown: z.string(), settings: z.unknown().optional() });

/**
 * The document kept in this browser, if it holds anything worth importing: an empty
 * document or the untouched sample does not.
 */
export function readLocalDocument(storage: Storage): LocalDocument | null {
  let json: unknown;
  try {
    const raw = storage.getItem(DOCUMENT_KEY);
    if (raw === null) return null;
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const stored = storedSchema.safeParse(json);
  if (!stored.success) return null;
  const { markdown } = stored.data;
  if (markdown.trim() === "" || markdown === SAMPLE_DOCUMENT) return null;
  const settings = documentSettingsSchema.safeParse(stored.data.settings);
  return { markdown, settings: settings.success ? settings.data : DEFAULT_SETTINGS };
}

function request<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(source.error);
  });
}

/** Opens the old image database, without creating it when it is not there. */
function openExisting(factory: IDBFactory): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const opening = factory.open(DATABASE);
    let created = false;
    opening.onupgradeneeded = () => {
      created = true;
      opening.transaction?.abort();
    };
    opening.onsuccess = () => resolve(created ? null : opening.result);
    opening.onerror = () => resolve(null);
  });
}

/** The images of the local document; none when they cannot be read. */
export async function readLocalImages(factory: IDBFactory): Promise<LocalImage[]> {
  const database = await openExisting(factory);
  if (!database) return [];
  try {
    if (!database.objectStoreNames.contains(STORE)) return [];
    const index = database
      .transaction(STORE, "readonly")
      .objectStore(STORE)
      .index(BY_DOCUMENT);
    const rows = (await request(index.getAll(DOCUMENT_ID))) as unknown[];
    const images: LocalImage[] = [];
    for (const row of rows) {
      const parsed = z
        .object({ name: z.string(), blob: z.instanceof(Blob) })
        .safeParse(row);
      if (!parsed.success) continue;
      const head = new Uint8Array(await parsed.data.blob.slice(0, 8).arrayBuffer());
      const type = detectAssetType(head);
      if (type) images.push({ name: parsed.data.name, type, blob: parsed.data.blob });
    }
    return images;
  } catch {
    return [];
  } finally {
    database.close();
  }
}

/** Forgets the local document and its images, once imported or discarded. */
export function forgetLocalDocument(storage: Storage, factory: IDBFactory): void {
  try {
    storage.removeItem(DOCUMENT_KEY);
  } catch {
    // Storage that cannot be written cannot be cleared either; nothing else to do.
  }
  factory.deleteDatabase(DATABASE);
}

/**
 * The Markdown with image references renamed, for images the server stored under
 * another name than the browser had.
 */
export function renameImageReferences(
  markdown: string,
  renamed: ReadonlyMap<string, string>,
): string {
  let result = markdown;
  for (const [from, to] of renamed) {
    if (from !== to) result = result.replaceAll(`](${from})`, `](${to})`);
  }
  return result;
}
