"use client";

import { toast } from "sonner";

import { convertResponseSchema } from "@/contracts/conversion";
import { bibliographyFor } from "@/documents/bibtex";
import { useAssetLibrary } from "@/features/assets/hooks/use-assets";
import { useCompilation } from "@/features/compilation/hooks/use-compilation";
import { requestConversion } from "@/features/conversion/model/request-conversion";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import { documentTitle } from "@/features/document/model/document-session";
import { exportFileName } from "@/features/document/model/file-name";
import { useCompleteStep } from "@/features/onboarding/hooks/use-first-steps";
import { useWorkspaceLayout } from "@/features/workspace/hooks/use-workspace-layout";
import { downloadFile, downloadTextFile } from "@/lib/download";

import { buildProjectArchive } from "../model/project-archive";

/** Thrown inside an export to stop it with a message for the user. */
class ExportError extends Error {}

export interface Exports {
  exportPdf(): void;
  exportLatex(): void;
  exportMarkdown(): void;
  exportProject(): void;
}

/** Every form the document can leave the application in, for menus and the palette. */
export function useExports(): Exports {
  const session = useDocumentSession();
  const library = useAssetLibrary();
  const compilation = useCompilation();
  const { dispatch } = useWorkspaceLayout();
  const completeStep = useCompleteStep();
  const markdown = () => session.getSnapshot().markdown;
  const fileName = (extension: string) =>
    exportFileName(documentTitle(session.getSnapshot()), extension);

  const fetchLatex = async (): Promise<string> => {
    const { markdown: text, settings, bibliography } = session.getSnapshot();
    const references = bibliographyFor(text, bibliography);
    const response = await requestConversion(
      "/api/convert",
      {
        markdown: text,
        standalone: true,
        settings,
        ...(references ? { bibliography: references } : {}),
      },
      convertResponseSchema,
      new AbortController().signal,
    );
    if (!response.ok) throw new ExportError(response.error.message);
    return response.latex;
  };

  /** The PDF for the document as it is now, compiling it if needed. */
  const currentPdf = async (): Promise<Uint8Array> => {
    if (compilation.pdf && !compilation.isStale) return compilation.pdf;
    const outcome = await compilation.compile();
    if (outcome?.ok) return outcome.pdf;
    // The preview pane explains what is wrong, line by line.
    compilation.setMode("pdf");
    dispatch({ type: "activate", pane: "preview" });
    throw new ExportError(
      outcome
        ? outcome.error.message
        : "La compilación se interrumpió. Vuelve a intentarlo.",
    );
  };

  const run = (
    work: () => Promise<void>,
    messages: { loading: string; success: string; failure: string },
  ) => {
    const done = work().then(() => completeStep("export"));
    toast.promise(done, {
      loading: messages.loading,
      success: messages.success,
      error: (error: unknown) => ({
        message: messages.failure,
        description:
          error instanceof ExportError ? error.message : "Ocurrió un error inesperado.",
      }),
    });
  };

  const exportMarkdown = () => {
    downloadTextFile(fileName("md"), markdown(), "text/markdown");
    completeStep("export");
  };

  const exportLatex = () =>
    run(
      async () =>
        downloadTextFile(fileName("tex"), await fetchLatex(), "application/x-tex"),
      {
        loading: "Generando el LaTeX…",
        success: "LaTeX descargado",
        failure: "No se pudo exportar el LaTeX",
      },
    );

  const exportPdf = () =>
    run(
      async () =>
        downloadFile(
          fileName("pdf"),
          (await currentPdf()) as BlobPart,
          "application/pdf",
        ),
      {
        loading: "Compilando el PDF…",
        success: "PDF descargado",
        failure: "No se pudo generar el PDF",
      },
    );

  const exportProject = () =>
    run(
      async () => {
        const latex = await fetchLatex();
        const images = await Promise.all(
          [...library.getSnapshot().keys()].map(async (name) => {
            const blob = await library.read(name);
            if (!blob) throw new ExportError(`No se pudo leer la imagen «${name}».`);
            return { name, data: new Uint8Array(await blob.arrayBuffer()) };
          }),
        );
        const archive = buildProjectArchive({
          baseName: fileName("zip").replace(/\.zip$/, ""),
          markdown: markdown(),
          latex,
          bibliography: session.getSnapshot().bibliography,
          images,
          // Only a PDF that matches the sources belongs with them.
          ...(compilation.pdf && !compilation.isStale ? { pdf: compilation.pdf } : {}),
        });
        downloadFile(fileName("zip"), archive as BlobPart, "application/zip");
      },
      {
        loading: "Preparando el proyecto…",
        success: "Proyecto descargado",
        failure: "No se pudo exportar el proyecto",
      },
    );

  return { exportPdf, exportLatex, exportMarkdown, exportProject };
}
