// @vitest-environment node
// Node, not jsdom: only Node's Blob survives fake-indexeddb's structured clone.
import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { SAMPLE_DOCUMENT } from "@/documents/sample-document";
import { DEFAULT_SETTINGS, templateSettings } from "@/templates/catalog";

import {
  forgetLocalDocument,
  readLocalDocument,
  readLocalImages,
  renameImageReferences,
} from "./local-document";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);

/** localStorage, in memory. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

const storage = memoryStorage();

function storeLocally(document: unknown) {
  storage.setItem("texflow:document:local", JSON.stringify(document));
}

/** Writes images the way the editor did before accounts existed. */
async function storeImages(names: string[]) {
  const opening = indexedDB.open("texflow", 1);
  opening.onupgradeneeded = () => {
    const store = opening.result.createObjectStore("assets", {
      keyPath: ["documentId", "name"],
    });
    store.createIndex("by-document", "documentId");
  };
  const database = await new Promise<IDBDatabase>((resolve) => {
    opening.onsuccess = () => resolve(opening.result);
  });
  const store = database.transaction("assets", "readwrite").objectStore("assets");
  for (const name of names) {
    store.put({ documentId: "local", name, type: "image/png", blob: new Blob([PNG]) });
  }
  await new Promise((resolve) => (store.transaction.oncomplete = resolve));
  database.close();
}

afterEach(() => forgetLocalDocument(storage, indexedDB));

describe("local document", () => {
  it("reads the text and design kept in this browser", () => {
    storeLocally({
      id: "local",
      markdown: "# Mío",
      settings: templateSettings("thesis"),
    });
    expect(readLocalDocument(storage)).toEqual({
      markdown: "# Mío",
      settings: templateSettings("thesis"),
    });
  });

  it("opens a document saved before templates existed with the default design", () => {
    storeLocally({ id: "local", markdown: "# Mío" });
    expect(readLocalDocument(storage)?.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("offers nothing for an untouched sample, an empty text or corrupt data", () => {
    storeLocally({ id: "local", markdown: SAMPLE_DOCUMENT });
    expect(readLocalDocument(storage)).toBeNull();
    storeLocally({ id: "local", markdown: "  " });
    expect(readLocalDocument(storage)).toBeNull();
    storage.setItem("texflow:document:local", "{nope");
    expect(readLocalDocument(storage)).toBeNull();
  });

  it("reads the local images, and forgets everything afterwards", async () => {
    await storeImages(["figura.png"]);
    const images = await readLocalImages(indexedDB);
    expect(images.map(({ name, type }) => ({ name, type }))).toEqual([
      { name: "figura.png", type: "image/png" },
    ]);

    storeLocally({ id: "local", markdown: "# Mío" });
    forgetLocalDocument(storage, indexedDB);
    expect(readLocalDocument(storage)).toBeNull();
    expect(await readLocalImages(indexedDB)).toEqual([]);
  });

  it("finds no images, and creates no database, when there never were any", async () => {
    expect(await readLocalImages(indexedDB)).toEqual([]);
    const databases = await indexedDB.databases();
    expect(databases.map(({ name }) => name)).not.toContain("texflow");
  });
});

describe("renameImageReferences", () => {
  it("follows the names the server gave the images", () => {
    const renamed = new Map([
      ["a.png", "a-2.png"],
      ["b.png", "b.png"],
    ]);
    expect(renameImageReferences("![A](a.png) ![B](b.png)", renamed)).toBe(
      "![A](a-2.png) ![B](b.png)",
    );
  });
});
