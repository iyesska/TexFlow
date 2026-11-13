import {
  COMPILE_FIELDS,
  COMPILE_WARNINGS_HEADER,
  compileFailureSchema,
  diagnosticsSchema,
  type CompileFailure,
  type Diagnostic,
} from "@/contracts/compilation";

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

/**
 * Asks the server to compile the document, sending the images it uses. Always
 * resolves: network trouble and malformed answers come back as errors.
 */
export async function requestCompilation(
  markdown: string,
  images: readonly { readonly name: string; readonly blob: Blob }[],
  signal: AbortSignal,
): Promise<CompilationOutcome> {
  const form = new FormData();
  form.set(COMPILE_FIELDS.markdown, markdown);
  for (const { name, blob } of images) form.append(COMPILE_FIELDS.image, blob, name);

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
