import { deriveTitle } from "@/documents/title";
import { settingsKey, type DocumentSettings } from "@/templates/settings";

/**
 * - saved: what the server has is what the writer sees.
 * - unsaved, saving: a change is waiting for, or on its way to, the server.
 * - error: the last save failed; it is retried on its own and on demand.
 * - signed-out: the server no longer knows the writer; nothing is saved until they
 *   sign in again (in another tab), then it is retried.
 * - conflict: another tab or device saved this document since it was opened here.
 *   Nothing is saved until the writer chooses whose version stays.
 */
export type SaveStatus =
  "saved" | "unsaved" | "saving" | "error" | "signed-out" | "conflict";

export interface DocumentSnapshot {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  readonly status: SaveStatus;
  /** The name the writer gave the document; null while its title follows the text. */
  readonly manualTitle: string | null;
}

/** A save: the content, and the revision of the server's copy it was edited from. */
export interface ContentChange {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  readonly baseRevision: number;
}

export type SaveOutcome =
  | { readonly ok: true; readonly revision: number }
  | { readonly ok: false; readonly reason: "conflict"; readonly revision: number }
  | { readonly ok: false; readonly reason: "signed-out" | "failed" };

export type RenameOutcome =
  | { readonly ok: true; readonly manualTitle: string | null }
  | { readonly ok: false; readonly message: string };

/** Where the open document is kept: the API, or a fake in tests. */
export interface DocumentStore {
  save(change: ContentChange): Promise<SaveOutcome>;
  /** Names the document, or with null lets its title follow the text again. */
  rename(title: string | null): Promise<RenameOutcome>;
}

export interface DocumentSession {
  readonly id: string;
  getSnapshot(): DocumentSnapshot;
  subscribe(listener: () => void): () => void;
  /** Records an edit and schedules an automatic save. */
  setMarkdown(markdown: string): void;
  /** Records a change of design and schedules an automatic save. */
  setSettings(settings: DocumentSettings): void;
  /** Saves pending changes now, and resolves once nothing is left to save. */
  flush(): Promise<void>;
  /** After a conflict: keeps this version, replacing the one saved elsewhere. */
  overwrite(): Promise<void>;
  rename(title: string | null): Promise<RenameOutcome>;
  /** The work the server does not have yet, as a save would send it; null if none. */
  pendingChange(): ContentChange | null;
  /**
   * Takes back work that was not saved when this document was last open in the tab,
   * and saves it on top of the revision it was edited from.
   */
  restore(change: ContentChange): void;
  /**
   * After a conflict: gives up this version, before the page loads the other one.
   * Nothing is saved from then on.
   */
  abandon(): void;
  dispose(): void;
}

export interface OpenedDocument {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  readonly revision: number;
  readonly manualTitle: string | null;
}

interface DocumentSessionOptions {
  readonly id: string;
  readonly store: DocumentStore;
  readonly initial: OpenedDocument;
  /** Quiet time after the last change before saving. */
  readonly autosaveDelayMs: number;
  /** Waits before retrying a failed save; the last one repeats. */
  readonly retryDelaysMs?: readonly number[];
}

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

/** The title to show: the writer's name for the document, or the text's own. */
export function documentTitle(snapshot: DocumentSnapshot): string {
  return snapshot.manualTitle ?? deriveTitle(snapshot.markdown);
}

/**
 * Holds the open document and saves it automatically, one save at a time, each on top
 * of the revision the previous one produced. Framework-free: React reads it through
 * `subscribe` and `getSnapshot`.
 */
export function createDocumentSession(options: DocumentSessionOptions): DocumentSession {
  const { id, store, initial, autosaveDelayMs } = options;
  const retryDelays = options.retryDelaysMs ?? RETRY_DELAYS_MS;
  const listeners = new Set<() => void>();
  let snapshot: DocumentSnapshot = {
    markdown: initial.markdown,
    settings: initial.settings,
    manualTitle: initial.manualTitle,
    status: "saved",
  };
  /** The server's revision this session's content is based on. */
  let baseRevision = initial.revision;
  /** The revision another tab or device saved, after a conflict. */
  let theirRevision = initial.revision;
  /** Counts edits, so a save can tell whether something changed while it ran. */
  let edits = 0;
  let failures = 0;
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const update = (next: Partial<DocumentSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };

  const cancelTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const schedule = (delay: number) => {
    cancelTimer();
    timer = setTimeout(() => void save(), delay);
  };

  const hasPendingWork = () =>
    snapshot.status === "unsaved" ||
    snapshot.status === "error" ||
    snapshot.status === "signed-out";

  const send = async () => {
    const editsAtStart = edits;
    const { markdown, settings } = snapshot;
    update({ status: "saving" });
    let outcome: SaveOutcome;
    try {
      outcome = await store.save({ markdown, settings, baseRevision });
    } catch {
      outcome = { ok: false, reason: "failed" };
    }
    if (disposed) return;

    if (outcome.ok) {
      baseRevision = outcome.revision;
      failures = 0;
      const changedMeanwhile = edits !== editsAtStart;
      update({ status: changedMeanwhile ? "unsaved" : "saved" });
      if (changedMeanwhile && timer === undefined) schedule(autosaveDelayMs);
      return;
    }
    if (outcome.reason === "conflict") {
      theirRevision = outcome.revision;
      cancelTimer();
      update({ status: "conflict" });
      return;
    }
    update({ status: outcome.reason === "signed-out" ? "signed-out" : "error" });
    const delay = retryDelays[Math.min(failures, retryDelays.length - 1)] ?? 60_000;
    failures++;
    schedule(delay);
  };

  /** Saves now, or right after the save that is running, if anything is left. */
  const save = async (): Promise<void> => {
    cancelTimer();
    if (disposed) return;
    if (inFlight) {
      await inFlight;
      return hasPendingWork() ? save() : undefined;
    }
    if (!hasPendingWork()) return;
    inFlight = send().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const changed = (next: Partial<DocumentSnapshot>) => {
    edits++;
    if (snapshot.status === "conflict" || disposed) {
      // Keep the writer's work on screen, but save nothing until they choose.
      update(next);
      return;
    }
    update({ ...next, status: "unsaved" });
    schedule(autosaveDelayMs);
  };

  return {
    id,

    getSnapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setMarkdown(markdown) {
      if (markdown !== snapshot.markdown) changed({ markdown });
    },

    setSettings(settings) {
      if (settingsKey(settings) !== settingsKey(snapshot.settings)) changed({ settings });
    },

    flush: save,

    async overwrite() {
      if (snapshot.status !== "conflict") return;
      baseRevision = theirRevision;
      update({ status: "unsaved" });
      await save();
    },

    async rename(title) {
      const outcome = await store.rename(title);
      if (outcome.ok && !disposed) update({ manualTitle: outcome.manualTitle });
      return outcome;
    },

    pendingChange() {
      if (snapshot.status === "saved") return null;
      return { markdown: snapshot.markdown, settings: snapshot.settings, baseRevision };
    },

    restore(change) {
      if (disposed) return;
      cancelTimer();
      edits++;
      baseRevision = change.baseRevision;
      update({ markdown: change.markdown, settings: change.settings, status: "unsaved" });
      void save();
    },

    abandon() {
      disposed = true;
      cancelTimer();
      update({ status: "saved" });
    },

    dispose() {
      disposed = true;
      cancelTimer();
      listeners.clear();
    },
  };
}
