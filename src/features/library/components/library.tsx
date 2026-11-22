"use client";

import { useRouter } from "next/navigation";
import { useMemo, useReducer, useState, useTransition } from "react";
import { toast } from "sonner";

import type {
  DocumentSummaryDto,
  FolderDto,
  TrashedDocumentDto,
} from "@/contracts/documents";
import { starterDocument } from "@/documents/starter-document";
import type { AccountUser } from "@/features/account/model/account";
import { DEFAULT_TEMPLATE_ID, templateSettings } from "@/templates/catalog";
import type { TemplateId } from "@/templates/settings";

import { useTrash, useTrashMoves } from "../hooks/use-trash";
import * as api from "../model/library-api";
import {
  documentCounts,
  libraryReducer,
  visibleDocuments,
  type LibraryView,
} from "../model/library-state";
import type { DocumentActions } from "./document-menu";
import { DocumentList } from "./document-list";
import { FolderChips, FolderNav, type FolderActions } from "./folder-nav";
import { ImportBanner } from "./import-banner";
import { LibraryDialogs, type LibraryDialog } from "./library-dialogs";
import { LibraryHeader } from "./library-header";
import { ListHeading } from "./list-heading";
import { TrashView, type TrashActions } from "./trash-view";

export interface LibraryProps {
  readonly user: AccountUser;
  readonly documents: readonly DocumentSummaryDto[];
  readonly folders: readonly FolderDto[];
  /** How many documents are in the trash. */
  readonly trashCount: number;
}

/** The signed-in user's documents and folders, and everything done to them. */
export function Library({ user, documents, folders, trashCount }: LibraryProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(libraryReducer, { documents, folders });
  const trash = useTrash(trashCount);
  // Coming back to the library brings the server's lists again: they replace what
  // this page knew, which may predate changes made in the editor.
  const [shownLists, setShownLists] = useState({ documents, folders });
  if (shownLists.documents !== documents || shownLists.folders !== folders) {
    setShownLists({ documents, folders });
    dispatch({ type: "replaced", state: { documents, folders } });
  }
  const [view, setView] = useState<LibraryView>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<LibraryDialog | null>(null);
  const [creating, setCreating] = useState(false);
  const [opening, startOpening] = useTransition();
  // One clock for the whole list, read when the page opens.
  const [now] = useState(() => new Date());

  const counts = useMemo(() => documentCounts(state), [state]);
  const folder =
    view.kind === "folder" ? state.folders.find(({ id }) => id === view.id) : undefined;
  // A folder that no longer exists leaves nothing to show: back to everything.
  const activeView = useMemo<LibraryView>(
    () => (view.kind === "folder" && !folder ? { kind: "all" } : view),
    [view, folder],
  );
  const shown = useMemo(
    () => visibleDocuments(state, activeView, query),
    [state, activeView, query],
  );

  const create = async (templateId: TemplateId = DEFAULT_TEMPLATE_ID) => {
    setCreating(true);
    const created = await api.createDocument({
      markdown: starterDocument(user.name),
      settings: templateSettings(templateId),
      folderId: activeView.kind === "folder" ? activeView.id : null,
    });
    setCreating(false);
    if (!created.ok) {
      toast.error("No se pudo crear el documento", { description: created.message });
      return;
    }
    startOpening(() => router.push(`/documents/${created.value.id}`));
  };

  /** Applies a change at once, and takes it back if the server refuses it. */
  const changeDocument = async (
    original: DocumentSummaryDto,
    optimistic: DocumentSummaryDto,
    request: () => Promise<
      { ok: true; value: DocumentSummaryDto } | { ok: false; message: string }
    >,
    failure: string,
  ): Promise<string | null> => {
    dispatch({ type: "documentChanged", document: optimistic });
    const result = await request();
    if (result.ok) {
      dispatch({ type: "documentChanged", document: result.value });
      return null;
    }
    dispatch({ type: "documentChanged", document: original });
    toast.error(failure, { description: result.message });
    return result.message;
  };

  const { restore, moveToTrash } = useTrashMoves(trash, dispatch);

  const trashActions: TrashActions = {
    restore: (document: TrashedDocumentDto) => void restore(document),
    deleteForever: (document) => setDialog({ kind: "delete-forever", document }),
  };

  const documentActions: DocumentActions = {
    open: (document) => router.push(`/documents/${document.id}`),
    rename: (document) => setDialog({ kind: "rename-document", document }),
    remove: (document) => void moveToTrash(document),
    async duplicate(document) {
      const copy = await api.duplicateDocument(document.id);
      if (!copy.ok) {
        toast.error("No se pudo duplicar el documento", { description: copy.message });
        return;
      }
      dispatch({ type: "documentAdded", document: copy.value });
      toast.success(`«${copy.value.title}» creado`);
    },
    async move(document, folderId) {
      const target = state.folders.find(({ id }) => id === folderId);
      const failed = await changeDocument(
        document,
        { ...document, folderId },
        () => api.moveDocument(document.id, folderId),
        "No se pudo mover el documento",
      );
      if (!failed) {
        toast.success(
          target ? `Movido a «${target.name}»` : "Movido fuera de las carpetas",
        );
      }
    },
  };

  const folderActions: FolderActions = {
    create: () => setDialog({ kind: "create-folder" }),
    rename: (target) => setDialog({ kind: "rename-folder", folder: target }),
    remove: (target) => setDialog({ kind: "delete-folder", folder: target }),
  };

  const list =
    activeView.kind === "trash" ? (
      <TrashView trash={trash} query={query} actions={trashActions} />
    ) : (
      <DocumentList
        view={activeView}
        hasDocuments={counts.all > 0}
        shown={shown}
        folders={state.folders}
        query={query}
        now={now}
        actions={documentActions}
        onCreate={(id) => void create(id)}
        onSearchEverywhere={() => setView({ kind: "all" })}
      />
    );

  const navProps = {
    view: activeView,
    onViewChange: setView,
    folders: state.folders,
    counts,
    trashCount: trash.count,
    actions: folderActions,
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <LibraryHeader
        user={user}
        query={query}
        onQueryChange={setQuery}
        creating={creating || opening}
        onCreate={(id) => void create(id)}
      />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-6 sm:px-6 md:grid-cols-[13.5rem_minmax(0,1fr)] md:py-8">
        <aside className="hidden md:block">
          <div className="sticky top-8">
            <FolderNav {...navProps} />
          </div>
        </aside>
        <main className="flex min-w-0 flex-col gap-4">
          <ImportBanner
            onImported={(document) => dispatch({ type: "documentAdded", document })}
          />
          <div className="md:hidden">
            <FolderChips {...navProps} />
          </div>
          {counts.all > 0 || activeView.kind === "trash" ? (
            <ListHeading
              view={activeView}
              folder={folder}
              count={activeView.kind === "trash" ? trash.count : shown.length}
              actions={folderActions}
              onEmptyTrash={() => setDialog({ kind: "empty-trash", count: trash.count })}
            />
          ) : null}
          {list}
        </main>
      </div>

      <LibraryDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        dispatch={dispatch}
        onViewChange={setView}
        trash={trash}
        renameDocument={(document, name) =>
          changeDocument(
            document,
            { ...document, title: name || document.title },
            () => api.renameDocument(document.id, name || null),
            "No se pudo cambiar el nombre",
          )
        }
      />
    </div>
  );
}
