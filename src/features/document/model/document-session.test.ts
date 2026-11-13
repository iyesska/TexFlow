import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, templateSettings } from "@/templates/catalog";

import type { StoredDocument } from "./document";
import { createDocumentSession } from "./document-session";
import { createLocalDocumentStore, type DocumentStore } from "./document-store";

function memoryStore(initial?: StoredDocument) {
  const saved: StoredDocument[] = [];
  let failing = false;
  const store: DocumentStore = {
    load: async () => initial ?? null,
    save: async (document) => {
      if (failing) throw new Error("quota");
      saved.push(document);
    },
  };
  return { store, saved, fail: (value: boolean) => (failing = value) };
}

const session = (store: DocumentStore) =>
  createDocumentSession({
    id: "doc",
    store,
    initialMarkdown: "# Ejemplo",
    initialSettings: DEFAULT_SETTINGS,
    autosaveDelayMs: 500,
    now: () => new Date("2026-01-01T00:00:00Z"),
  });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("document session", () => {
  it("starts from the sample when nothing is stored", async () => {
    const doc = session(memoryStore().store);
    expect(doc.getSnapshot().status).toBe("loading");
    await doc.load();
    expect(doc.getSnapshot()).toEqual({
      markdown: "# Ejemplo",
      settings: DEFAULT_SETTINGS,
      status: "saved",
    });
  });

  it("loads the stored document", async () => {
    const stored = {
      id: "doc",
      markdown: "guardado",
      settings: templateSettings("thesis"),
      updatedAt: "2025-01-01T00:00:00Z",
    };
    const doc = session(memoryStore(stored).store);
    await doc.load();
    expect(doc.getSnapshot().markdown).toBe("guardado");
    expect(doc.getSnapshot().settings.templateId).toBe("thesis");
  });

  it("saves once after the editing pause, with the latest content", async () => {
    const { store, saved } = memoryStore();
    const doc = session(store);
    await doc.load();

    doc.setMarkdown("a");
    await vi.advanceTimersByTimeAsync(300);
    doc.setMarkdown("ab");
    expect(doc.getSnapshot().status).toBe("unsaved");
    await vi.advanceTimersByTimeAsync(499);
    expect(saved).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(saved).toEqual([
      {
        id: "doc",
        markdown: "ab",
        settings: DEFAULT_SETTINGS,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(doc.getSnapshot().status).toBe("saved");
  });

  it("saves immediately on flush and does nothing when already saved", async () => {
    const { store, saved } = memoryStore();
    const doc = session(store);
    await doc.load();

    doc.setMarkdown("ahora");
    await doc.flush();
    expect(saved).toHaveLength(1);

    await doc.flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(saved).toHaveLength(1);
  });

  it("reports a failed save and recovers on the next one", async () => {
    const { store, saved, fail } = memoryStore();
    const doc = session(store);
    await doc.load();

    fail(true);
    doc.setMarkdown("x");
    await vi.advanceTimersByTimeAsync(500);
    expect(doc.getSnapshot().status).toBe("error");

    fail(false);
    await doc.flush();
    expect(doc.getSnapshot().status).toBe("saved");
    expect(saved.at(-1)?.markdown).toBe("x");
  });

  it("saves a change of design like an edit, and ignores one that changes nothing", async () => {
    const { store, saved } = memoryStore();
    const doc = session(store);
    await doc.load();

    doc.setSettings({ ...DEFAULT_SETTINGS });
    expect(doc.getSnapshot().status).toBe("saved");

    const thesis = templateSettings("thesis");
    doc.setSettings(thesis);
    expect(doc.getSnapshot()).toMatchObject({ settings: thesis, status: "unsaved" });
    await vi.advanceTimersByTimeAsync(500);
    expect(saved.at(-1)?.settings).toEqual(thesis);
    expect(doc.getSnapshot().status).toBe("saved");
  });

  it("stays unsaved when something changes while a save is running", async () => {
    let finish = () => {};
    const saved: StoredDocument[] = [];
    const slow: DocumentStore = {
      load: async () => null,
      save: (document) =>
        new Promise((resolve) => {
          finish = () => {
            saved.push(document);
            resolve();
          };
        }),
    };
    const doc = session(slow);
    await doc.load();

    doc.setMarkdown("primero");
    const saving = doc.flush();
    doc.setSettings(templateSettings("minimal"));
    finish();
    await saving;
    expect(doc.getSnapshot().status).toBe("unsaved");
    expect(saved[0]?.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("notifies subscribers and stops after unsubscribing", async () => {
    const doc = session(memoryStore().store);
    const listener = vi.fn();
    const unsubscribe = doc.subscribe(listener);
    await doc.load();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    doc.setMarkdown("z");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("local document store", () => {
  it("round-trips a document and rejects corrupt data", async () => {
    const store = createLocalDocumentStore(() => window.localStorage);
    const document = {
      id: "a",
      markdown: "# Hola",
      settings: templateSettings("research-paper"),
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await store.save(document);
    expect(await store.load("a")).toEqual(document);
    expect(await store.load("missing")).toBeNull();

    window.localStorage.setItem("texflow:document:bad", "{not json");
    expect(await store.load("bad")).toBeNull();
    window.localStorage.setItem("texflow:document:odd", JSON.stringify({ id: 1 }));
    expect(await store.load("odd")).toBeNull();
  });
});

describe("local document store with older or damaged designs", () => {
  const store = createLocalDocumentStore(() => window.localStorage);
  const save = (value: unknown) =>
    window.localStorage.setItem("texflow:document:viejo", JSON.stringify(value));

  it("opens a document saved before templates existed with the default design", async () => {
    save({ id: "viejo", markdown: "# Texto", updatedAt: "2025-01-01T00:00:00Z" });
    expect(await store.load("viejo")).toMatchObject({
      markdown: "# Texto",
      settings: DEFAULT_SETTINGS,
    });
  });

  it("keeps the text when the stored design no longer validates", async () => {
    save({
      id: "viejo",
      markdown: "# Texto",
      updatedAt: "2025-01-01T00:00:00Z",
      settings: { ...DEFAULT_SETTINGS, font: "comic-sans" },
    });
    expect(await store.load("viejo")).toMatchObject({
      markdown: "# Texto",
      settings: DEFAULT_SETTINGS,
    });
  });
});
