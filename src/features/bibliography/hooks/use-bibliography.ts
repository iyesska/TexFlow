"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { scanBibtex } from "@/documents/bibtex";
import {
  appendEntries,
  removeEntry,
  replaceEntry,
  serializeEntry,
  type NewEntry,
} from "@/documents/bibtex-edit";
import {
  useDocumentBibliography,
  useDocumentMarkdown,
  useDocumentSession,
} from "@/features/document/hooks/use-document";
import { useEditorSessionCache } from "@/features/editor/hooks/use-editor-session-cache";
import { useSettledValue } from "@/hooks/use-settled-value";

import { listReferences, type ReferenceList } from "../model/references";

export interface Bibliography extends ReferenceList {
  readonly bibtex: string;
  /** Replaces the whole BibTeX text, as the raw editor does. */
  setBibtex(bibtex: string): void;
  add(entry: NewEntry): void;
  /** Rewrites the entry that had `key`, keeping fields the form does not offer. */
  update(key: string, entry: NewEntry, extra: Readonly<Record<string, string>>): void;
  /** Removes an entry, with a way to undo it. */
  remove(key: string): void;
  /** Adds the entries of a .bib file; resolves to how many were new. */
  importText(text: string): { readonly added: number; readonly skipped: number };
  /** Writes [@key] at the cursor; false when the Markdown editor is not on screen. */
  cite(key: string): boolean;
}

/** The open document's references, and everything done to them. */
export function useBibliography(): Bibliography {
  const session = useDocumentSession();
  const cache = useEditorSessionCache();
  const bibtex = useDocumentBibliography();
  // Which references are cited, and which cited keys are missing, follow the text
  // once a pause in typing settles it: "@pe" on the way to "@perez2020" is no error.
  const markdown = useSettledValue(useDocumentMarkdown(), 1000);
  const list = useMemo(() => listReferences(bibtex, markdown), [bibtex, markdown]);

  // Each change starts from the session's latest text, not from this render's.
  const current = () => session.getSnapshot().bibliography;

  return {
    ...list,
    bibtex,
    setBibtex: (next) => session.setBibliography(next),
    add: (entry) =>
      session.setBibliography(appendEntries(current(), serializeEntry(entry))),
    update: (key, entry, extra) =>
      session.setBibliography(replaceEntry(current(), key, serializeEntry(entry, extra))),
    remove(key) {
      const before = current();
      session.setBibliography(removeEntry(before, key));
      toast(`Referencia «${key}» eliminada`, {
        action: { label: "Deshacer", onClick: () => session.setBibliography(before) },
      });
    },
    importText(text) {
      const existing = new Set(scanBibtex(current()).entries.map(({ key }) => key));
      const incoming = scanBibtex(text);
      const fresh = incoming.entries.filter(({ key }) => !existing.has(key));
      if (fresh.length > 0) {
        const added = [...incoming.definitions, ...fresh]
          .map(({ start, end }) => text.slice(start, end))
          .join("\n\n");
        session.setBibliography(appendEntries(current(), added));
      }
      return { added: fresh.length, skipped: incoming.entries.length - fresh.length };
    },
    cite: (key) => cache.insertAtCursor(`[@${key}]`),
  };
}
