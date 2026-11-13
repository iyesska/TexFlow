import { z } from "zod";

import { DEFAULT_SETTINGS } from "@/templates/catalog";
import { documentSettingsSchema } from "@/templates/settings";

import type { StoredDocument } from "./document";

/**
 * Where documents are kept. The editor only knows this interface: today it is backed
 * by the browser, from phase 7 by the API.
 */
export interface DocumentStore {
  load(id: string): Promise<StoredDocument | null>;
  save(document: StoredDocument): Promise<void>;
}

const storedDocumentSchema = z.object({
  id: z.string().min(1),
  markdown: z.string(),
  updatedAt: z.string(),
  // Checked on its own below: settings that no longer validate must not cost the text.
  settings: z.unknown().optional(),
});

const storageKey = (id: string) => `texflow:document:${id}`;

/**
 * A store backed by Web Storage. Takes a getter because `localStorage` only exists in
 * the browser and must not be touched while rendering on the server.
 */
export function createLocalDocumentStore(getStorage: () => Storage): DocumentStore {
  return {
    async load(id) {
      const raw = getStorage().getItem(storageKey(id));
      if (raw === null) return null;
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return null;
      }
      const result = storedDocumentSchema.safeParse(json);
      if (!result.success) return null;
      // Documents saved before templates existed, or with settings from a newer
      // version, open with the default design.
      const settings = documentSettingsSchema.safeParse(result.data.settings);
      return {
        id: result.data.id,
        markdown: result.data.markdown,
        updatedAt: result.data.updatedAt,
        settings: settings.success ? settings.data : DEFAULT_SETTINGS,
      };
    },
    async save(document) {
      // Throws when the quota is exceeded; the session reports that as a failed save.
      getStorage().setItem(storageKey(document.id), JSON.stringify(document));
    },
  };
}
