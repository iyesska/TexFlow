"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { VersionSummaryDto } from "@/contracts/documents";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import { openedDocument } from "@/features/document/model/api-document-store";
import type {
  DocumentSession,
  SaveStatus,
} from "@/features/document/model/document-session";

import { keepNamedVersion, restoreVersion } from "../model/history-api";
import { versionMoment, versionName } from "../model/timeline";

/** Why the history cannot act on the document yet, by what is holding up the save. */
const NOT_SAVED: Readonly<Partial<Record<SaveStatus, string>>> = {
  error:
    "Los últimos cambios no se han podido guardar. Inténtalo de nuevo en un momento.",
  "signed-out":
    "Tu sesión ha caducado. Vuelve a iniciar sesión para guardar los cambios.",
  conflict:
    "Este documento se ha guardado desde otra pestaña o dispositivo. Elige antes qué versión conservar.",
};

const CHANGED_ELSEWHERE =
  "El documento ha cambiado en otra pestaña o dispositivo. Recarga la página para verlo antes de restaurar una versión.";

/**
 * Saves what is left to save, so the server has the text on screen before a version
 * is kept or restored. Resolves to why it could not, or null.
 */
async function saveFirst(session: DocumentSession): Promise<string | null> {
  await session.flush();
  const { status } = session.getSnapshot();
  if (status === "saved") return null;
  return NOT_SAVED[status] ?? "Espera a que terminen de guardarse los cambios.";
}

/** How a restore is told about: which version came back, and from when. */
function restoredMessage(version: VersionSummaryDto): string {
  const when = versionMoment(version.createdAt, new Date());
  return `${versionName(version)}, ${when}. El texto anterior queda en el historial.`;
}

export type KeepOutcome =
  | { readonly ok: true; readonly version: VersionSummaryDto }
  | { readonly ok: false; readonly message: string };

/** Keeping a version with a name, and restoring one, for the open document. */
export function useVersionActions() {
  const session = useDocumentSession();
  const [restoring, setRestoring] = useState<string | null>(null);

  const keep = async (label: string): Promise<KeepOutcome> => {
    const problem = await saveFirst(session);
    if (problem) return { ok: false, message: problem };
    const result = await keepNamedVersion(session.id, label);
    return result.ok
      ? { ok: true, version: result.value }
      : { ok: false, message: result.message };
  };

  /** Puts a version back; resolves to whether it was. */
  const restore = async (
    version: VersionSummaryDto,
    { undoing = false }: { undoing?: boolean } = {},
  ): Promise<boolean> => {
    setRestoring(version.id);
    try {
      const problem = await saveFirst(session);
      const result = problem
        ? null
        : await restoreVersion(session.id, version.id, session.revision());
      if (!result?.ok) {
        const message = result?.code === "conflict" ? CHANGED_ELSEWHERE : result?.message;
        toast.error(undoing ? "No se pudo deshacer" : "No se pudo restaurar la versión", {
          description: problem ?? message,
        });
        return false;
      }
      // Edits made while the restore ran stay on screen; their save then meets the
      // restored revision as a conflict, and the writer chooses.
      if (session.pendingChange() === null) {
        session.replace(openedDocument(result.value.document));
      }
      const { kept } = result.value;
      if (undoing) {
        toast.success("Restauración deshecha");
      } else {
        toast.success("Versión restaurada", {
          description: restoredMessage(version),
          action: {
            label: "Deshacer",
            onClick: () => void restore(kept, { undoing: true }),
          },
        });
      }
      return true;
    } finally {
      setRestoring(null);
    }
  };

  return { keep, restore, restoring };
}
