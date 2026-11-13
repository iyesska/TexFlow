import "server-only";

import path from "node:path";

import type { ConversionError } from "@/contracts/conversion";
import { LIMITS } from "@/config/limits";
import {
  runProcess,
  type ProcessLimits,
  type ProcessResult,
} from "@/server/sandbox/run-process";
import { createSemaphore } from "@/server/sandbox/semaphore";

const PANDOC_LIMITS: ProcessLimits = {
  timeoutMs: 10_000,
  cpuSeconds: 10,
  maxFileBytes: 16 * 1024 * 1024,
  maxOutputBytes: 8 * 1024 * 1024,
};

/** Pandoc's own heap limit; an address-space rlimit would break the Haskell runtime. */
const PANDOC_HEAP = "512m";

const MAX_CONCURRENT_RUNS = 4;
const MAX_QUEUE_WAIT_MS = 5000;
const MAX_DETAIL_LENGTH = 2000;

const runs = createSemaphore(MAX_CONCURRENT_RUNS);

/** Markdown as TexFlow reads it. "Introducción" is labelled "introduccion". */
export const MARKDOWN_FORMAT = "markdown+ascii_identifiers";

export type PandocResult =
  | { readonly ok: true; readonly output: string; readonly warnings: string[] }
  | { readonly ok: false; readonly error: ConversionError };

const failure = (error: ConversionError): PandocResult => ({ ok: false, error });

/**
 * Absolute path of a file under `pandoc/`: filters and templates we ship. They are
 * trusted code of ours; nothing the user writes ever ends up in a path.
 */
export function pandocResource(...segments: string[]): string {
  return path.join(process.cwd(), "pandoc", ...segments);
}

function interpretFailure(result: ProcessResult): PandocResult {
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

  const detail = result.stderr.trim().slice(0, MAX_DETAIL_LENGTH);
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

/**
 * Inside the sandbox Pandoc cannot read its translation files and says so each time a
 * template is used. That is expected and tells the writer nothing.
 */
const NOISE = [/could not load translations/i, /has no translation defined/i];

/** Pandoc reports recoverable problems on stderr as "[WARNING] ..." lines. */
function parseWarnings(stderr: string): string[] {
  return stderr
    .split("\n")
    .filter((line) => line.startsWith("[WARNING]"))
    .map((line) => line.replace("[WARNING]", "").trim())
    .filter((warning) => !NOISE.some((pattern) => pattern.test(warning)));
}

/**
 * Runs Pandoc on a Markdown document inside the process sandbox.
 *
 * `options` is chosen by the server, never by the user: the document only ever
 * travels on stdin, so it cannot become an option or a file path. `--sandbox` makes
 * Pandoc's readers and writers refuse to read files or reach the network.
 */
export async function runPandoc(
  markdown: string,
  options: readonly string[],
  pandocPath: string,
): Promise<PandocResult> {
  if (markdown.length > LIMITS.maxMarkdownLength) {
    return failure({
      code: "too-large",
      message: "El documento es demasiado largo para convertirlo.",
    });
  }

  const result = await runs.run(
    () =>
      runProcess({
        command: pandocPath,
        args: ["+RTS", `-M${PANDOC_HEAP}`, "-RTS", "--sandbox", ...options],
        stdin: markdown,
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
  return { ok: true, output: result.stdout, warnings: parseWarnings(result.stderr) };
}
