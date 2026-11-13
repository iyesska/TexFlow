import { settingsKey, type DocumentSettings } from "@/templates/settings";

import type { DocumentStore } from "./document-store";

export type SaveStatus = "loading" | "saved" | "unsaved" | "saving" | "error";

export interface DocumentSnapshot {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  readonly status: SaveStatus;
}

export interface DocumentSession {
  getSnapshot(): DocumentSnapshot;
  subscribe(listener: () => void): () => void;
  /** Reads the stored document, or starts a new one when there is none. */
  load(): Promise<void>;
  /** Records an edit and schedules an automatic save. */
  setMarkdown(markdown: string): void;
  /** Records a change of design and schedules an automatic save. */
  setSettings(settings: DocumentSettings): void;
  /** Saves pending changes immediately. */
  flush(): Promise<void>;
  dispose(): void;
}

interface DocumentSessionOptions {
  readonly id: string;
  readonly store: DocumentStore;
  /** Content of a document that has never been saved. */
  readonly initialMarkdown: string;
  /** Design of a document that has never been saved. */
  readonly initialSettings: DocumentSettings;
  /** Quiet time after the last change before saving. */
  readonly autosaveDelayMs: number;
  readonly now?: () => Date;
}

/**
 * Holds the open document and saves it automatically. Framework-free: React reads it
 * through `subscribe` and `getSnapshot`.
 */
export function createDocumentSession(options: DocumentSessionOptions): DocumentSession {
  const { id, store, initialMarkdown, initialSettings, autosaveDelayMs } = options;
  const now = options.now ?? (() => new Date());
  const listeners = new Set<() => void>();
  let snapshot: DocumentSnapshot = {
    markdown: "",
    settings: initialSettings,
    status: "loading",
  };
  /** Counts changes, so a save can tell whether something changed while it ran. */
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const update = (next: Partial<DocumentSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };

  const cancelTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const save = async () => {
    cancelTimer();
    const saving = revision;
    const { markdown, settings } = snapshot;
    update({ status: "saving" });
    try {
      await store.save({ id, markdown, settings, updatedAt: now().toISOString() });
    } catch {
      update({ status: "error" });
      return;
    }
    // A change made while the save was in flight keeps the document unsaved.
    update({ status: revision === saving ? "saved" : "unsaved" });
  };

  const changed = (next: Partial<DocumentSnapshot>) => {
    revision++;
    update({ ...next, status: "unsaved" });
    cancelTimer();
    timer = setTimeout(() => void save(), autosaveDelayMs);
  };

  return {
    getSnapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async load() {
      let stored = null;
      try {
        stored = await store.load(id);
      } catch {
        // Unreadable storage is treated as an empty one: the user can still write.
      }
      // Changes made before the load finished win over what was stored.
      if (snapshot.status !== "loading") return;
      update({
        markdown: stored?.markdown ?? initialMarkdown,
        settings: stored?.settings ?? initialSettings,
        status: "saved",
      });
    },

    setMarkdown(markdown) {
      if (markdown !== snapshot.markdown) changed({ markdown });
    },

    setSettings(settings) {
      if (settingsKey(settings) !== settingsKey(snapshot.settings)) changed({ settings });
    },

    async flush() {
      if (snapshot.status === "unsaved" || snapshot.status === "error") await save();
    },

    dispose() {
      cancelTimer();
      listeners.clear();
    },
  };
}
