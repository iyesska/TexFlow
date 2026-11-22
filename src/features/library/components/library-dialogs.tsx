"use client";

import type { Dispatch } from "react";
import { toast } from "sonner";

import {
  FOLDER_NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type DocumentSummaryDto,
  type FolderDto,
  type TrashedDocumentDto,
} from "@/contracts/documents";

import type { Trash } from "../hooks/use-trash";
import * as api from "../model/library-api";
import type { LibraryAction, LibraryView } from "../model/library-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NameDialog } from "@/components/name-dialog";

/** The dialog the library has open, if any, and what it is about. */
export type LibraryDialog =
  | { readonly kind: "rename-document"; readonly document: DocumentSummaryDto }
  | { readonly kind: "delete-forever"; readonly document: TrashedDocumentDto }
  | { readonly kind: "empty-trash"; readonly count: number }
  | { readonly kind: "create-folder" }
  | { readonly kind: "rename-folder"; readonly folder: FolderDto }
  | { readonly kind: "delete-folder"; readonly folder: FolderDto };

interface LibraryDialogsProps {
  readonly dialog: LibraryDialog | null;
  readonly onClose: () => void;
  readonly dispatch: Dispatch<LibraryAction>;
  readonly onViewChange: (view: LibraryView) => void;
  readonly trash: Trash;
  /** Renames a document; resolves to why it failed, or null. */
  readonly renameDocument: (
    document: DocumentSummaryDto,
    name: string,
  ) => Promise<string | null>;
}

/** Asks for names and confirmations, and carries out what was confirmed. */
export function LibraryDialogs({
  dialog,
  onClose,
  dispatch,
  onViewChange,
  trash,
  renameDocument,
}: LibraryDialogsProps) {
  switch (dialog?.kind) {
    case "rename-document":
      return (
        <NameDialog
          title="Cambiar el nombre del documento"
          description="Déjalo vacío para que el nombre siga al título del texto."
          label="Nombre"
          initialValue={dialog.document.title}
          submitLabel="Cambiar nombre"
          maxLength={TITLE_MAX_LENGTH}
          allowEmpty
          onSubmit={(name) => renameDocument(dialog.document, name)}
          onClose={onClose}
        />
      );

    case "delete-forever":
      return (
        <ConfirmDialog
          title={`¿Eliminar «${dialog.document.title}» para siempre?`}
          description="Se eliminarán el documento, sus imágenes y su historial de versiones. No se puede deshacer."
          confirmLabel="Eliminar para siempre"
          onConfirm={async () => {
            const result = await api.deleteForever(dialog.document.id);
            if (!result.ok) {
              toast.error("No se pudo eliminar el documento", {
                description: result.message,
              });
              return false;
            }
            trash.removed(dialog.document.id);
            toast.success(`«${dialog.document.title}» eliminado para siempre`);
            return true;
          }}
          onClose={onClose}
        />
      );

    case "empty-trash":
      return (
        <ConfirmDialog
          title="¿Vaciar la papelera?"
          description={`Se eliminarán para siempre ${
            dialog.count === 1 ? "el documento" : `los ${dialog.count} documentos`
          } de la papelera, con sus imágenes y su historial. No se puede deshacer.`}
          confirmLabel="Vaciar papelera"
          onConfirm={async () => {
            const result = await api.emptyTrash();
            if (!result.ok) {
              toast.error("No se pudo vaciar la papelera", {
                description: result.message,
              });
              return false;
            }
            trash.cleared();
            toast.success("Papelera vaciada");
            return true;
          }}
          onClose={onClose}
        />
      );

    case "create-folder":
      return (
        <NameDialog
          title="Nueva carpeta"
          label="Nombre de la carpeta"
          initialValue=""
          placeholder="Tesis, Asignaturas, Artículos…"
          submitLabel="Crear carpeta"
          maxLength={FOLDER_NAME_MAX_LENGTH}
          onSubmit={async (name) => {
            const created = await api.createFolder(name);
            if (!created.ok) return created.message;
            dispatch({ type: "folderAdded", folder: created.value });
            onViewChange({ kind: "folder", id: created.value.id });
            return null;
          }}
          onClose={onClose}
        />
      );

    case "rename-folder":
      return (
        <NameDialog
          title="Cambiar el nombre de la carpeta"
          label="Nombre de la carpeta"
          initialValue={dialog.folder.name}
          submitLabel="Cambiar nombre"
          maxLength={FOLDER_NAME_MAX_LENGTH}
          onSubmit={async (name) => {
            const renamed = await api.renameFolder(dialog.folder.id, name);
            if (!renamed.ok) return renamed.message;
            dispatch({
              type: "folderRenamed",
              id: dialog.folder.id,
              name: renamed.value.name,
            });
            return null;
          }}
          onClose={onClose}
        />
      );

    case "delete-folder":
      return (
        <ConfirmDialog
          title={`¿Eliminar la carpeta «${dialog.folder.name}»?`}
          description="Sus documentos no se eliminan: pasan a estar fuera de las carpetas."
          confirmLabel="Eliminar carpeta"
          onConfirm={async () => {
            const result = await api.deleteFolder(dialog.folder.id);
            if (!result.ok) {
              toast.error("No se pudo eliminar la carpeta", {
                description: result.message,
              });
              return false;
            }
            dispatch({ type: "folderRemoved", id: dialog.folder.id });
            onViewChange({ kind: "all" });
            toast.success(`Carpeta «${dialog.folder.name}» eliminada`);
            return true;
          }}
          onClose={onClose}
        />
      );

    default:
      return null;
  }
}
