"use client";

import { useCallback, useState, type Dispatch } from "react";
import { toast } from "sonner";

import type { DocumentSummaryDto, TrashedDocumentDto } from "@/contracts/documents";

import * as api from "../model/library-api";
import type { LibraryAction } from "../model/library-state";

export type TrashList =
  /** Not read yet, or being read. */
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "ready"; readonly documents: readonly TrashedDocumentDto[] };

export interface Trash {
  /** How many documents the trash holds, known before its list is read. */
  readonly count: number;
  readonly list: TrashList;
  /** Reads the list from the server. */
  load(): Promise<void>;
  /** Shows "loading" and reads the list again, after a failure. */
  retry(): void;
  /** A document just moved to the trash. */
  added(document: DocumentSummaryDto): void;
  /** A document restored or deleted for good. */
  removed(id: string): void;
  /** Everything deleted for good. */
  cleared(): void;
}

/** The library's trash: read when it is first shown, kept in step with every change. */
export function useTrash(initialCount: number): Trash {
  const [count, setCount] = useState(initialCount);
  const [list, setList] = useState<TrashList>({ status: "loading" });

  const load = useCallback(async () => {
    const result = await api.fetchTrash();
    if (!result.ok) {
      setList({ status: "failed", message: result.message });
      return;
    }
    setList({ status: "ready", documents: result.value });
    setCount(result.value.length);
  }, []);

  const retry = useCallback(() => {
    setList({ status: "loading" });
    void load();
  }, [load]);

  const added = useCallback((document: DocumentSummaryDto) => {
    setCount((current) => current + 1);
    setList((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            documents: [
              { ...document, deletedAt: new Date().toISOString() },
              ...current.documents,
            ],
          }
        : current,
    );
  }, []);

  const removed = useCallback((id: string) => {
    setCount((current) => Math.max(0, current - 1));
    setList((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            documents: current.documents.filter((document) => document.id !== id),
          }
        : current,
    );
  }, []);

  const cleared = useCallback(() => {
    setCount(0);
    setList({ status: "ready", documents: [] });
  }, []);

  return { count, list, load, retry, added, removed, cleared };
}

/** Moving documents to the trash and back, keeping the library and the trash in step. */
export function useTrashMoves(trash: Trash, dispatch: Dispatch<LibraryAction>) {
  /** Takes a document out of the trash, back into the list. */
  const restore = async (document: DocumentSummaryDto) => {
    const restored = await api.restoreDocument(document.id);
    if (!restored.ok) {
      toast.error("No se pudo restaurar el documento", { description: restored.message });
      return;
    }
    trash.removed(document.id);
    dispatch({ type: "documentAdded", document: restored.value });
    toast.success(`«${restored.value.title}» restaurado`);
  };

  /** Moves a document to the trash at once; the notice offers to take it back. */
  const moveToTrash = async (document: DocumentSummaryDto) => {
    dispatch({ type: "documentRemoved", id: document.id });
    const result = await api.trashDocument(document.id);
    if (!result.ok) {
      dispatch({ type: "documentAdded", document });
      toast.error("No se pudo eliminar el documento", { description: result.message });
      return;
    }
    trash.added(document);
    toast(`«${document.title}» se ha movido a la papelera`, {
      description: "Se guarda allí 30 días.",
      action: { label: "Deshacer", onClick: () => void restore(document) },
    });
  };

  return { restore, moveToTrash };
}
