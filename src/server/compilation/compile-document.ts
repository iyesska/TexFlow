import "server-only";

import type { CompileFailure, Diagnostic } from "@/contracts/compilation";
import { convertMarkdownToLatex } from "@/server/conversion/convert-markdown";
import { runProcess, type ProcessLimits } from "@/server/sandbox/run-process";
import { createSemaphore } from "@/server/sandbox/semaphore";
import type { DocumentSettings } from "@/templates/settings";

import { parseDiagnostics } from "./diagnostics";

const TECTONIC_LIMITS: ProcessLimits = {
  timeoutMs: 60_000,
  cpuSeconds: 60,
  maxFileBytes: 64 * 1024 * 1024,
  maxOutputBytes: 4 * 1024 * 1024,
  maxMemoryBytes: 4 * 1024 * 1024 * 1024,
};

/** Compiling is the heaviest thing the server does: two at a time. */
const MAX_CONCURRENT_COMPILES = 2;
const MAX_QUEUE_WAIT_MS = 20_000;

const SOURCE = "main.tex";
const PDF = "main.pdf";
const LOG = "main.log";

const compiles = createSemaphore(MAX_CONCURRENT_COMPILES);

export interface CompileImage {
  /** A name that has passed ASSET_NAME_PATTERN. */
  readonly name: string;
  readonly data: Uint8Array;
}

export interface CompileSettings {
  readonly pandocPath: string;
  readonly tectonicPath: string;
  /** Tectonic's package cache, filled in advance by scripts/setup-tectonic.sh. */
  readonly cacheDir: string;
}

export type CompileResult =
  | { readonly ok: true; readonly pdf: Buffer; readonly warnings: Diagnostic[] }
  | CompileFailure;

const failure = (error: CompileFailure["error"]): CompileFailure => ({
  ok: false,
  error,
});

/**
 * Compiles a Markdown document to PDF: Pandoc writes the LaTeX, Tectonic typesets it.
 *
 * Tectonic runs with `--untrusted` (no shell escape) and `--only-cached` (no network
 * of its own), and only ever inside the OS sandbox: LaTeX can read any file it can
 * reach, so the engine must not be able to reach anything but the job's own files.
 */
export async function compileDocument(
  markdown: string,
  images: readonly CompileImage[],
  design: DocumentSettings,
  settings: CompileSettings,
  signal?: AbortSignal,
  /** The BibTeX entries the document cites. */
  bibliography = "",
): Promise<CompileResult> {
  const converted = await convertMarkdownToLatex(
    { markdown, standalone: true, settings: design, bibliography },
    settings.pandocPath,
  );
  if (!converted.ok) return converted;
  const latex = converted.latex;

  const result = await compiles.run(
    () =>
      runProcess({
        command: settings.tectonicPath,
        args: [
          "--untrusted",
          "--only-cached",
          "--chatter=minimal",
          "--keep-logs",
          SOURCE,
        ],
        files: [{ name: SOURCE, data: latex }, ...images],
        collect: [PDF, LOG],
        limits: TECTONIC_LIMITS,
        isolation: "required",
        readOnlyPaths: [settings.cacheDir],
        env: { TECTONIC_CACHE_DIR: settings.cacheDir },
        ...(signal ? { signal } : {}),
      }),
    MAX_QUEUE_WAIT_MS,
  );

  if (result === null) {
    return failure({
      code: "busy",
      message:
        "El servidor está compilando otros documentos. Vuelve a intentarlo en un momento.",
    });
  }

  switch (result.failure) {
    case "isolation-unavailable":
      console.error(
        "[compilation] The host cannot isolate processes; refusing to run LaTeX.",
      );
      return failure({
        code: "unavailable",
        message:
          "La compilación a PDF no está disponible: este servidor no puede aislar el proceso de LaTeX.",
      });
    case "not-found":
    case "spawn-error":
      console.error(`[compilation] Tectonic could not be started (${result.failure}).`);
      return failure({
        code: "unavailable",
        message:
          "La compilación a PDF no está disponible. Comprueba que Tectonic está instalado.",
      });
    case "timeout":
    case "output-limit":
    case "aborted":
      return failure({
        code: "limit-exceeded",
        message: "La compilación superó el límite de tiempo o de tamaño y se detuvo.",
      });
  }

  const log = result.outputs.get(LOG)?.toString("utf8") ?? "";
  const diagnostics = parseDiagnostics(result.stderr, log, latex, markdown);
  const pdf = result.outputs.get(PDF);

  if (result.exitCode === 0 && pdf) {
    return {
      ok: true,
      pdf,
      warnings: diagnostics.filter(({ severity }) => severity === "warning"),
    };
  }
  if (result.exitCode === null) {
    return failure({
      code: "limit-exceeded",
      message: "La compilación agotó el tiempo de CPU o la memoria permitidos.",
    });
  }

  const errors = diagnostics.filter(({ severity }) => severity === "error");
  return failure({
    code: "compile-error",
    message:
      errors.length === 1
        ? "El documento tiene un error que impide generar el PDF."
        : "El documento tiene errores que impiden generar el PDF.",
    diagnostics:
      errors.length > 0
        ? errors
        : [{ severity: "error", message: "LaTeX no pudo componer el documento." }],
  });
}
