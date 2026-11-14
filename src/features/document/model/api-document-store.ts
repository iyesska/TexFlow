import { z } from "zod";

import {
  documentSummarySchema,
  saveResultSchema,
  type DocumentDto,
} from "@/contracts/documents";
import { callApi } from "@/lib/api-client";

import type { DocumentStore, OpenedDocument } from "./document-session";

/**
 * Saves small enough to send with `keepalive`, which lets them finish while the page
 * closes. Each UTF-16 unit is at most three bytes of UTF-8: this stays under 64 KB.
 */
const KEEPALIVE_MAX_LENGTH = 20_000;

const renamedSchema = z.object({ document: documentSummarySchema });

/** A document as the API sends it, as a session opens it. */
export function openedDocument(document: DocumentDto): OpenedDocument {
  return {
    markdown: document.markdown,
    settings: document.settings,
    bibliography: document.bibliography,
    revision: document.revision,
    manualTitle: document.titleSource === "manual" ? document.title : null,
  };
}

/** Whether a save of this text can still finish after the page is closed. */
export function canSaveWhileClosing(markdown: string): boolean {
  return markdown.length < KEEPALIVE_MAX_LENGTH;
}

/** The open document, kept by the API at /api/documents/:id. */
export function createApiDocumentStore(documentId: string): DocumentStore {
  const url = `/api/documents/${documentId}`;
  return {
    async save(change) {
      const json = { action: "save", ...change };
      const result = await callApi(
        url,
        {
          method: "PATCH",
          json,
          keepalive: canSaveWhileClosing(change.markdown),
        },
        saveResultSchema,
      );
      if (result.ok && result.value) return { ok: true, revision: result.value.revision };
      if (result.ok) return { ok: false, reason: "failed" };
      if (result.code === "conflict" && result.revision !== undefined) {
        return { ok: false, reason: "conflict", revision: result.revision };
      }
      return {
        ok: false,
        reason: result.code === "unauthorized" ? "signed-out" : "failed",
      };
    },

    async rename(title) {
      const result = await callApi(
        url,
        { method: "PATCH", json: { action: "rename", title } },
        renamedSchema,
      );
      if (!result.ok) return { ok: false, message: result.message };
      const document = result.value?.document;
      if (!document) return { ok: false, message: "No se pudo cambiar el nombre." };
      return {
        ok: true,
        manualTitle: document.titleSource === "manual" ? document.title : null,
      };
    },
  };
}
