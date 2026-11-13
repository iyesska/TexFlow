"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import {
  useDocumentSession,
  useDocumentSettings,
  useSaveStatus,
} from "@/features/document/hooks/use-document";
import { isCustomized, templateById, templateSettings } from "@/templates/catalog";
import {
  documentSettingsSchema,
  type DocumentSettings,
  type TemplateId,
} from "@/templates/settings";

export interface Design {
  readonly settings: DocumentSettings;
  /** False until the document has loaded: there is nothing to design yet. */
  readonly isReady: boolean;
  /** True when the settings differ from their template's. */
  readonly isCustomized: boolean;
  /**
   * Changes some settings. Returns why the change was refused (margins that leave no
   * room for the text, say), or null when it was applied.
   */
  update(patch: Partial<DocumentSettings>): string | null;
  /** Switches template. The text and the document's language are kept. */
  applyTemplate(id: TemplateId): void;
  /** Puts back the current template's own settings. */
  reset(): void;
}

/** The open document's design, and the ways to change it. */
export function useDesign(): Design {
  const session = useDocumentSession();
  const settings = useDocumentSettings();
  const isReady = useSaveStatus() !== "loading";

  const update = useCallback(
    (patch: Partial<DocumentSettings>) => {
      const result = documentSettingsSchema.safeParse({
        ...session.getSnapshot().settings,
        ...patch,
      });
      if (!result.success)
        return result.error.issues[0]?.message ?? "Ese ajuste no es válido.";
      session.setSettings(result.data);
      return null;
    },
    [session],
  );

  const applyTemplate = useCallback(
    (id: TemplateId) => {
      const previous = session.getSnapshot().settings;
      if (previous.templateId === id && !isCustomized(previous)) return;
      session.setSettings(templateSettings(id, previous.language));
      // Adjustments made by hand are worth an undo; a plain switch is not.
      if (isCustomized(previous)) {
        toast(`Plantilla «${templateById(id).name}» aplicada`, {
          description: "Se han sustituido los ajustes que habías cambiado.",
          action: { label: "Deshacer", onClick: () => session.setSettings(previous) },
        });
      }
    },
    [session],
  );

  const reset = useCallback(() => {
    const current = session.getSnapshot().settings;
    session.setSettings(templateSettings(current.templateId, current.language));
  }, [session]);

  return {
    settings,
    isReady,
    isCustomized: isCustomized(settings),
    update,
    applyTemplate,
    reset,
  };
}
