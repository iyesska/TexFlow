import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, templateSettings } from "@/templates/catalog";

import {
  createDocumentSession,
  documentTitle,
  type ContentChange,
  type DocumentStore,
  type SaveOutcome,
} from "./document-session";

/** A server in memory: it keeps a revision and refuses saves made on an older one. */
function fakeServer() {
  const saves: ContentChange[] = [];
  const queued: (SaveOutcome | Promise<SaveOutcome>)[] = [];
  let revision = 3;
  const store: DocumentStore = {
    save: async (change) => {
      saves.push(change);
      const next = queued.shift();
      if (next) {
        const outcome = await next;
        if (outcome.ok) revision = outcome.revision;
        return outcome;
      }
      if (change.baseRevision !== revision)
        return { ok: false, reason: "conflict", revision };
      revision++;
      return { ok: true, revision };
    },
    rename: async (title) => ({ ok: true, manualTitle: title?.trim() || null }),
  };
  return {
    store,
    saves,
    /** Another tab saves. */
    saveElsewhere: () => revision++,
    /** The next save answers with this, or waits for it. */
    answerNext: (outcome: SaveOutcome | Promise<SaveOutcome>) => queued.push(outcome),
  };
}

function open(store: DocumentStore) {
  return createDocumentSession({
    id: "doc",
    store,
    initial: {
      markdown: "# Informe",
      settings: DEFAULT_SETTINGS,
      revision: 3,
      manualTitle: null,
    },
    autosaveDelayMs: 500,
    retryDelaysMs: [1_000, 4_000],
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("document session", () => {
  it("opens with the document as the server has it", () => {
    const doc = open(fakeServer().store);
    expect(doc.getSnapshot()).toEqual({
      markdown: "# Informe",
      settings: DEFAULT_SETTINGS,
      manualTitle: null,
      status: "saved",
    });
  });

  it("saves once after the editing pause, each save on top of the previous one", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    doc.setMarkdown("# Informe 1");
    doc.setMarkdown("# Informe 12");
    expect(doc.getSnapshot().status).toBe("unsaved");
    await vi.advanceTimersByTimeAsync(499);
    expect(server.saves).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.saves).toEqual([
      { markdown: "# Informe 12", settings: DEFAULT_SETTINGS, baseRevision: 3 },
    ]);
    expect(doc.getSnapshot().status).toBe("saved");

    doc.setMarkdown("# Informe 123");
    await doc.flush();
    expect(server.saves[1]?.baseRevision).toBe(4);
  });

  it("saves immediately on flush, and does nothing when already saved", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    await doc.flush();
    expect(server.saves).toHaveLength(0);
    doc.setMarkdown("ya");
    await doc.flush();
    expect(server.saves).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(server.saves).toHaveLength(1);
  });

  it("never runs two saves at once: a change made during one is saved after it", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    let answer: (outcome: SaveOutcome) => void = () => {};
    server.answerNext(new Promise((resolve) => (answer = resolve)));

    doc.setMarkdown("primero");
    await vi.advanceTimersByTimeAsync(500);
    expect(doc.getSnapshot().status).toBe("saving");
    doc.setMarkdown("segundo");
    await vi.advanceTimersByTimeAsync(500);
    expect(server.saves).toHaveLength(1);

    answer({ ok: true, revision: 4 });
    const flushed = doc.flush();
    await vi.advanceTimersByTimeAsync(0);
    await flushed;
    expect(server.saves.map(({ markdown }) => markdown)).toEqual(["primero", "segundo"]);
    expect(server.saves[1]?.baseRevision).toBe(4);
    expect(doc.getSnapshot().status).toBe("saved");
  });

  it("stops saving after a conflict, and replaces the other version only if asked", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    server.saveElsewhere();
    doc.setMarkdown("mi versión");
    await doc.flush();
    expect(doc.getSnapshot().status).toBe("conflict");

    // Edits stay on screen but are not saved over the other version.
    doc.setMarkdown("mi versión, ampliada");
    await vi.advanceTimersByTimeAsync(5_000);
    await doc.flush();
    expect(server.saves).toHaveLength(1);
    expect(doc.getSnapshot()).toMatchObject({
      markdown: "mi versión, ampliada",
      status: "conflict",
    });

    await doc.overwrite();
    expect(server.saves[1]).toMatchObject({
      markdown: "mi versión, ampliada",
      baseRevision: 4,
    });
    expect(doc.getSnapshot().status).toBe("saved");
  });

  it("can give up its version after a conflict, saving nothing more", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    server.saveElsewhere();
    doc.setMarkdown("mi versión");
    await doc.flush();
    doc.abandon();
    expect(doc.getSnapshot().status).toBe("saved");
    doc.setMarkdown("otra cosa");
    await doc.flush();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(server.saves).toHaveLength(1);
  });

  it("reports a failed save and retries it on its own", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    server.answerNext({ ok: false, reason: "failed" });
    server.answerNext({ ok: false, reason: "failed" });
    doc.setMarkdown("cambio");
    await doc.flush();
    expect(doc.getSnapshot().status).toBe("error");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(server.saves).toHaveLength(2);
    expect(doc.getSnapshot().status).toBe("error");
    await vi.advanceTimersByTimeAsync(4_000);
    expect(server.saves).toHaveLength(3);
    expect(doc.getSnapshot().status).toBe("saved");
  });

  it("tells a signed-out writer apart from a failure, and saves once they are back", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    server.answerNext({ ok: false, reason: "signed-out" });
    doc.setMarkdown("cambio");
    await doc.flush();
    expect(doc.getSnapshot().status).toBe("signed-out");
    await doc.flush();
    expect(doc.getSnapshot().status).toBe("saved");
  });

  it("treats an error thrown by the store as a failed save", async () => {
    const doc = open({
      save: () => Promise.reject(new Error("network")),
      rename: async () => ({ ok: true, manualTitle: null }),
    });
    doc.setMarkdown("cambio");
    await doc.flush();
    expect(doc.getSnapshot().status).toBe("error");
  });

  it("saves a change of design like an edit, and ignores one that changes nothing", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    doc.setSettings({ ...DEFAULT_SETTINGS });
    expect(doc.getSnapshot().status).toBe("saved");
    doc.setSettings(templateSettings("thesis"));
    await doc.flush();
    expect(server.saves[0]?.settings.templateId).toBe("thesis");
  });

  it("renames the document, and lets its title follow the text again", async () => {
    const doc = open(fakeServer().store);
    expect(documentTitle(doc.getSnapshot())).toBe("Informe");
    await doc.rename("  Mi nombre ");
    expect(documentTitle(doc.getSnapshot())).toBe("Mi nombre");
    await doc.rename(null);
    expect(documentTitle(doc.getSnapshot())).toBe("Informe");
  });

  it("reports the work the server does not have yet, with the revision it is based on", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    expect(doc.pendingChange()).toBeNull();
    doc.setMarkdown("sin guardar");
    expect(doc.pendingChange()).toEqual({
      markdown: "sin guardar",
      settings: DEFAULT_SETTINGS,
      baseRevision: 3,
    });
    await doc.flush();
    expect(doc.pendingChange()).toBeNull();
  });

  it("takes back unsaved work and saves it on the revision it was edited from", async () => {
    const server = fakeServer();
    const doc = open(server.store);
    doc.restore({
      markdown: "recuperado",
      settings: templateSettings("thesis"),
      baseRevision: 3,
    });
    expect(doc.getSnapshot()).toMatchObject({ markdown: "recuperado", status: "saving" });
    await doc.flush();
    expect(server.saves).toEqual([
      { markdown: "recuperado", settings: templateSettings("thesis"), baseRevision: 3 },
    ]);
    expect(doc.getSnapshot().status).toBe("saved");
  });

  it("notifies subscribers and stops after unsubscribing", () => {
    const doc = open(fakeServer().store);
    const listener = vi.fn();
    const unsubscribe = doc.subscribe(listener);
    doc.setMarkdown("a");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    doc.setMarkdown("b");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
