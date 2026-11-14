"use client";

import { HardDriveDownload, LoaderCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DocumentSummaryDto } from "@/contracts/documents";
import { deriveTitle } from "@/documents/title";

import { createDocument, saveDocumentContent, uploadImage } from "../model/library-api";
import {
  forgetLocalDocument,
  readLocalDocument,
  readLocalImages,
  renameImageReferences,
  type LocalDocument,
} from "../model/local-document";
import { ConfirmDialog } from "./confirm-dialog";

// localStorage has no change event within a tab: read it once per page.
let localDocument: LocalDocument | null | undefined;
const readOnce = () => (localDocument ??= readLocalDocument(window.localStorage));
const subscribe = () => () => {
  // Nothing to unsubscribe from: the value is read once.
};

/**
 * Offers to bring in the document this browser kept before accounts existed, with its
 * images, once. Shown only when there is one worth importing.
 */
export function ImportBanner({
  onImported,
}: {
  onImported: (document: DocumentSummaryDto) => void;
}) {
  const local = useSyncExternalStore(subscribe, readOnce, () => null);
  const [done, setDone] = useState(false);
  const [importing, setImporting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  if (!local || done) return null;

  const forget = () => {
    forgetLocalDocument(window.localStorage, window.indexedDB);
    setDone(true);
  };

  const importDocument = async () => {
    setImporting(true);
    const created = await createDocument({
      markdown: local.markdown,
      settings: local.settings,
    });
    if (!created.ok) {
      setImporting(false);
      toast.error("No se pudo importar el documento", { description: created.message });
      return;
    }
    const document = created.value;
    const images = await readLocalImages(window.indexedDB);
    const renamed = new Map<string, string>();
    let failed = 0;
    for (const image of images) {
      const uploaded = await uploadImage(document.id, image.blob, image.name);
      if (uploaded.ok) renamed.set(image.name, uploaded.value);
      else failed++;
    }
    const markdown = renameImageReferences(local.markdown, renamed);
    if (markdown !== local.markdown) {
      await saveDocumentContent(document.id, {
        markdown,
        settings: local.settings,
        baseRevision: 0,
      });
    }
    forget();
    onImported(document);
    toast.success("Documento importado", {
      description:
        failed > 0
          ? `No se pudieron subir ${failed} de sus imágenes.`
          : "Ya está con el resto de tus documentos.",
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-info/30 bg-info/10 px-4 py-3 sm:flex-row sm:items-center">
      <HardDriveDownload
        className="hidden size-5 shrink-0 text-info sm:block"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-ui font-medium">
          Este navegador guarda «{deriveTitle(local.markdown)}»
        </p>
        <p className="text-xs text-pretty text-muted-foreground">
          Lo escribiste antes de tener cuenta. Impórtalo para tenerlo con el resto de tus
          documentos, en cualquier dispositivo.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={importing}
          onClick={() => setDiscarding(true)}
        >
          Descartar
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => void importDocument()}
        >
          {importing ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          Importar
        </Button>
      </div>
      {discarding ? (
        <ConfirmDialog
          title="¿Descartar el documento de este navegador?"
          description="Se borrará de este navegador junto con sus imágenes. No se puede deshacer."
          confirmLabel="Descartar"
          onConfirm={async () => {
            forget();
            return true;
          }}
          onClose={() => setDiscarding(false)}
        />
      ) : null}
    </div>
  );
}
