"use client";

import type { Dispatch } from "react";
import { toast } from "sonner";

import {
  FOLDER_NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type DocumentSummaryDto,
  type FolderDto,
} from "@/contracts/documents";

import * as api from "../model/library-api";
import type { LibraryAction, LibraryView } from "../model/library-state";
import { ConfirmDialog } from "./confirm-dialog";
import { NameDialog } from "./name-dialog";

/** The dialog the library has open, if any, and what it is about. */
export type LibraryDialog =
  | { readonly kind: "rename-document"; readonly document: DocumentSummaryDto }
  | { readonly kind: "delete-document"; readonly document: DocumentSummaryDto }
  | { readonly kind: "create-folder" }
  | { readonly kind: "rename-folder"; readonly folder: FolderDto }
  | { readonly kind: "delete-folder"; readonly folder: FolderDto };

interface LibraryDialogsProps {
  readonly dialog: LibraryDialog | null;
  readonly onClose: () => void;
  readonly dispatch: Dispatch<LibraryAction>;
  readonly onViewChange: (view: LibraryView) => void;
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

    case "delete-document":
      return (
        <ConfirmDialog
          title={`¿Eliminar «${dialog.document.title}»?`}
          description="Se eliminarán el documento y sus imágenes. No se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={async () => {
            const result = await api.deleteDocument(dialog.document.id);
            if (!result.ok) {
              toast.error("No se pudo eliminar el documento", {
                description: result.message,
              });
              return false;
            }
            dispatch({ type: "documentRemoved", id: dialog.document.id });
            toast.success(`«${dialog.document.title}» eliminado`);
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
