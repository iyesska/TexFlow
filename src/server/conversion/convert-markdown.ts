import "server-only";

import type {
  ConversionError,
  ConvertRequest,
  ConvertResponse,
} from "@/contracts/convert";
import { LIMITS } from "@/config/limits";
import {
  runProcess,
  type ProcessLimits,
  type ProcessResult,
} from "@/server/sandbox/run-process";
import { createSemaphore } from "@/server/sandbox/semaphore";

import { withPreambleNotes } from "./body-requirements";

const PANDOC_LIMITS: ProcessLimits = {
  timeoutMs: 10_000,
  cpuSeconds: 10,
  maxFileBytes: 16 * 1024 * 1024,
  maxOutputBytes: 8 * 1024 * 1024,
};

/** Pandoc's own heap limit; an address-space rlimit would break the Haskell runtime. */
const PANDOC_HEAP = "512m";

const MAX_CONCURRENT_CONVERSIONS = 4;
const MAX_QUEUE_WAIT_MS = 5000;
const MAX_DETAIL_LENGTH = 2000;

const conversions = createSemaphore(MAX_CONCURRENT_CONVERSIONS);

/**
 * The full argument list. It is fixed apart from one boolean, and the document only
 * ever travels on stdin, so user content can never become an option or a file path.
 * `--sandbox` makes Pandoc refuse to read files or reach the network.
 */
function pandocArgs(standalone: boolean): string[] {
  return [
    "+RTS",
    `-M${PANDOC_HEAP}`,
    "-RTS",
    "--sandbox",
    // ascii_identifiers: "Introducción" is labelled "introduccion", not "introducciuxf3n".
    "--from=markdown+ascii_identifiers",
    "--to=latex",
    "--wrap=preserve",
    // A whole document can load the listings package; a fragment must stand alone.
    ...(standalone ? ["--standalone", "--listings"] : ["--no-highlight"]),
  ];
}

const failure = (error: ConversionError): ConvertResponse => ({ ok: false, error });

function trimDetail(stderr: string): string {
  return stderr.trim().slice(0, MAX_DETAIL_LENGTH);
}

function interpretFailure(result: ProcessResult): ConvertResponse {
  if (result.failure === "not-found" || result.failure === "spawn-error") {
    console.error(`[conversion] Pandoc could not be started (${result.failure}).`);
    return failure({
      code: "unavailable",
      message:
        "El conversor no está disponible en este servidor. Comprueba que Pandoc está instalado.",
    });
  }

  const heapExhausted = /heap exhausted/i.test(result.stderr);
  if (result.failure || result.exitCode === null || heapExhausted) {
    return failure({
      code: "limit-exceeded",
      message:
        "La conversión superó el límite de tiempo, memoria o tamaño. Prueba a dividir el documento.",
    });
  }

  const detail = trimDetail(result.stderr);
  const line = /\bline (\d+)/i.exec(detail)?.[1];
  if (/YAML/i.test(detail)) {
    return failure({
      code: "syntax",
      message: "El bloque de metadatos YAML del documento tiene un error de sintaxis.",
      detail,
      ...(line ? { line: Number(line) } : {}),
    });
  }
  console.error(`[conversion] Pandoc exited with code ${result.exitCode}: ${detail}`);
  return failure({
    code: "failed",
    message: "Pandoc no pudo convertir el documento.",
    ...(detail ? { detail } : {}),
    ...(line ? { line: Number(line) } : {}),
  });
}

/** Pandoc reports recoverable problems on stderr as "[WARNING] ..." lines. */
function parseWarnings(stderr: string): string[] {
  return stderr
    .split("\n")
    .filter((line) => line.startsWith("[WARNING]"))
    .map((line) => line.replace("[WARNING]", "").trim());
}

/** Converts Markdown to LaTeX with Pandoc, inside the process sandbox. */
export async function convertMarkdownToLatex(
  request: ConvertRequest,
  pandocPath: string,
): Promise<ConvertResponse> {
  if (request.markdown.length > LIMITS.maxMarkdownLength) {
    return failure({
      code: "too-large",
      message: "El documento es demasiado largo para convertirlo.",
    });
  }

  const result = await conversions.run(
    () =>
      runProcess({
        command: pandocPath,
        args: pandocArgs(request.standalone),
        stdin: request.markdown,
        limits: PANDOC_LIMITS,
      }),
    MAX_QUEUE_WAIT_MS,
  );

  if (result === null) {
    return failure({
      code: "busy",
      message:
        "El servidor está ocupado convirtiendo otros documentos. Se reintentará enseguida.",
    });
  }
  if (result.failure || result.exitCode !== 0) return interpretFailure(result);

  return {
    ok: true,
    latex: request.standalone ? result.stdout : withPreambleNotes(result.stdout),
    warnings: parseWarnings(result.stderr),
  };
}
