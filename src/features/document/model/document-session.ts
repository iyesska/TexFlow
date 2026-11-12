import type { DocumentStore } from "./document-store";

export type SaveStatus = "loading" | "saved" | "unsaved" | "saving" | "error";

export interface DocumentSnapshot {
  readonly markdown: string;
  readonly status: SaveStatus;
}

export interface DocumentSession {
  getSnapshot(): DocumentSnapshot;
  subscribe(listener: () => void): () => void;
  /** Reads the stored document, or starts from `initialMarkdown` when there is none. */
  load(): Promise<void>;
  /** Records an edit and schedules an automatic save. */
  setMarkdown(markdown: string): void;
  /** Saves pending edits immediately. */
  flush(): Promise<void>;
  dispose(): void;
}

interface DocumentSessionOptions {
  readonly id: string;
  readonly store: DocumentStore;
  /** Content of a document that has never been saved. */
  readonly initialMarkdown: string;
  /** Quiet time after the last edit before saving. */
  readonly autosaveDelayMs: number;
  readonly now?: () => Date;
}

/**
 * Holds the open document and saves it automatically. Framework-free: React reads it
 * through `subscribe` and `getSnapshot`.
 */
export function createDocumentSession(options: DocumentSessionOptions): DocumentSession {
  const { id, store, initialMarkdown, autosaveDelayMs, now = () => new Date() } = options;
  const listeners = new Set<() => void>();
  let snapshot: DocumentSnapshot = { markdown: "", status: "loading" };
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
    const markdown = snapshot.markdown;
    update({ status: "saving" });
    try {
      await store.save({ id, markdown, updatedAt: now().toISOString() });
    } catch {
      update({ status: "error" });
      return;
    }
    // An edit made while the save was in flight keeps the document unsaved.
    if (snapshot.markdown === markdown) update({ status: "saved" });
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
      // Edits made before the load finished win over what was stored.
      if (snapshot.status !== "loading") return;
      update({ markdown: stored?.markdown ?? initialMarkdown, status: "saved" });
    },

    setMarkdown(markdown) {
      if (markdown === snapshot.markdown) return;
      update({ markdown, status: "unsaved" });
      cancelTimer();
      timer = setTimeout(() => void save(), autosaveDelayMs);
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
