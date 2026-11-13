"use client";

import type { EditorView } from "@codemirror/view";
import { useCallback } from "react";
import { toast } from "sonner";

import { useAssetLibrary } from "@/features/assets/hooks/use-assets";
import {
  ASSET_LIMITS,
  suggestedAltText,
  type AssetRejection,
} from "@/features/assets/model/asset";

import { insertParagraph } from "../codemirror/commands";

const MAX_MEGABYTES = ASSET_LIMITS.maxBytes / (1024 * 1024);

function rejectionMessage(fileName: string, reason: AssetRejection) {
  switch (reason) {
    case "unsupported-type":
      return {
        title: `«${fileName}» no es una imagen PNG o JPEG`,
        description: "Son los formatos que admite el documento LaTeX.",
      };
    case "too-large":
      return {
        title: `«${fileName}» supera el límite de ${MAX_MEGABYTES} MB`,
        description: "Reduce su tamaño o su resolución y vuelve a añadirla.",
      };
    case "too-many":
      return {
        title: `No se pudo añadir «${fileName}»`,
        description: `El documento ya tiene ${ASSET_LIMITS.maxPerDocument} imágenes, el máximo.`,
      };
    case "storage-failed":
      return {
        title: `No se pudo guardar «${fileName}»`,
        description: "El almacenamiento del navegador puede estar lleno.",
      };
  }
}

/**
 * Returns a function that adds image files to the document and inserts a reference
 * to each one in the editor, at `position` or at the cursor.
 */
export function useImageInsertion(
  view: EditorView | null,
): (files: readonly File[], position?: number | null) => Promise<void> {
  const library = useAssetLibrary();

  return useCallback(
    async (files, position = null) => {
      if (!view) return;
      let at = position;
      for (const file of files) {
        const result = await library.add(file);
        if (!result.ok) {
          const { title, description } = rejectionMessage(file.name, result.reason);
          toast.error(title, { description });
          continue;
        }
        insertParagraph(`![${suggestedAltText(file.name)}](${result.name})`, at)(view);
        // Only the first image goes to the drop position; the rest follow the cursor.
        at = null;
      }
      view.focus();
    },
    [library, view],
  );
}
