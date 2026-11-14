"use client";

import { Download, FileArchive, FileCode, FileText, FileType } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { convertResponseSchema } from "@/contracts/conversion";
import { useAssetLibrary } from "@/features/assets/hooks/use-assets";
import { useCompilation } from "@/features/compilation/hooks/use-compilation";
import { requestConversion } from "@/features/conversion/model/request-conversion";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import { documentTitle } from "@/features/document/model/document-session";
import { exportFileName } from "@/features/document/model/file-name";
import { useWorkspaceLayout } from "@/features/workspace/hooks/use-workspace-layout";
import { downloadFile, downloadTextFile } from "@/lib/download";

import { buildProjectArchive } from "../model/project-archive";

/** Thrown inside an export to stop it with a message for the user. */
class ExportError extends Error {}

/** Offers the document in every form it can leave the application. */
export function ExportMenu() {
  const session = useDocumentSession();
  const library = useAssetLibrary();
  const compilation = useCompilation();
  const { dispatch } = useWorkspaceLayout();
  const markdown = () => session.getSnapshot().markdown;
  const fileName = (extension: string) =>
    exportFileName(documentTitle(session.getSnapshot()), extension);

  const fetchLatex = async (): Promise<string> => {
    const response = await requestConversion(
      "/api/convert",
      {
        markdown: markdown(),
        standalone: true,
        settings: session.getSnapshot().settings,
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
    toast.promise(work(), {
      loading: messages.loading,
      success: messages.success,
      error: (error: unknown) => ({
        message: messages.failure,
        description:
          error instanceof ExportError ? error.message : "Ocurrió un error inesperado.",
      }),
    });
  };

  const exportMarkdown = () =>
    downloadTextFile(fileName("md"), markdown(), "text/markdown");

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Download />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={exportPdf}>
          <FileType />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportLatex}>
          <FileCode />
          LaTeX (.tex)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportMarkdown}>
          <FileText />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={exportProject}>
          <FileArchive />
          Proyecto completo (.zip)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
