import {
  COMPILE_FIELDS,
  COMPILE_WARNINGS_HEADER,
  compileFailureSchema,
  diagnosticsSchema,
  type CompileFailure,
  type Diagnostic,
} from "@/contracts/compilation";
import type { DocumentSettings } from "@/templates/settings";

export type CompilationOutcome =
  | { readonly ok: true; readonly pdf: Uint8Array; readonly warnings: Diagnostic[] }
  | CompileFailure;

const failure = (error: CompileFailure["error"]): CompileFailure => ({
  ok: false,
  error,
});

function readWarnings(header: string | null): Diagnostic[] {
  if (!header) return [];
  try {
    const parsed = diagnosticsSchema.safeParse(JSON.parse(decodeURIComponent(header)));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export interface CompileRequest {
  readonly markdown: string;
  readonly settings: DocumentSettings;
  /** The stored document whose images the Markdown refers to. */
  readonly documentId: string;
  /** The BibTeX entries the Markdown cites; empty when it cites none. */
  readonly bibliography?: string;
}

/**
 * Asks the server to compile the document. The images stay where they are: the
 * server takes them from the stored document. Always resolves: network trouble and
 * malformed answers come back as errors.
 */
export async function requestCompilation(
  request: CompileRequest,
  signal: AbortSignal,
): Promise<CompilationOutcome> {
  const form = new FormData();
  form.set(COMPILE_FIELDS.markdown, request.markdown);
  form.set(COMPILE_FIELDS.settings, JSON.stringify(request.settings));
  form.set(COMPILE_FIELDS.documentId, request.documentId);
  if (request.bibliography) form.set(COMPILE_FIELDS.bibliography, request.bibliography);

  let response: Response;
  try {
    response = await fetch("/api/compile", { method: "POST", body: form, signal });
  } catch {
    return failure({
      code: "unavailable",
      message: "No se pudo contactar con el servidor. Comprueba tu conexión.",
    });
  }

  if (response.ok && response.headers.get("content-type")?.includes("application/pdf")) {
    return {
      ok: true,
      pdf: new Uint8Array(await response.arrayBuffer()),
      warnings: readWarnings(response.headers.get(COMPILE_WARNINGS_HEADER)),
    };
  }

  const parsed = compileFailureSchema.safeParse(await response.json().catch(() => null));
  if (parsed.success) return parsed.data;
  return failure({
    code: "failed",
    message: "El servidor devolvió una respuesta inesperada.",
  });
}
