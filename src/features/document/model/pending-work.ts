import { z } from "zod";

import { documentSettingsSchema, settingsKey } from "@/templates/settings";

import type { ContentChange, DocumentSnapshot } from "./document-session";

/**
 * Unsaved work, kept in the tab's sessionStorage while the page goes away. A reload
 * asks the server for the page before the last save leaves the old one, so that save
 * can land after the new page has read the document. The new page takes the work
 * back from here, and the server recognises a save it already has.
 */

const key = (documentId: string) => `texflow:pending:${documentId}`;

const pendingSchema = z.object({
  markdown: z.string(),
  settings: documentSettingsSchema,
  baseRevision: z.number().int().min(0),
});

export function keepPendingWork(
  storage: Storage,
  documentId: string,
  change: ContentChange,
): void {
  try {
    storage.setItem(key(documentId), JSON.stringify(change));
  } catch {
    // A full or blocked storage keeps nothing; the save on the way out still runs.
  }
}

export function readPendingWork(
  storage: Storage,
  documentId: string,
): ContentChange | null {
  try {
    const raw = storage.getItem(key(documentId));
    if (raw === null) return null;
    const parsed = pendingSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function forgetPendingWork(storage: Storage, documentId: string): void {
  try {
    storage.removeItem(key(documentId));
  } catch {
    // Nothing to forget in a storage that cannot be read.
  }
}

/** Whether the kept work says anything the open document does not. */
export function differsFrom(change: ContentChange, snapshot: DocumentSnapshot): boolean {
  return (
    change.markdown !== snapshot.markdown ||
    settingsKey(change.settings) !== settingsKey(snapshot.settings)
  );
}
