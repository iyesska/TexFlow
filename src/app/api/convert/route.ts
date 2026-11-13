import {
  convertRequestSchema,
  type ConversionErrorCode,
  type ConvertResponse,
} from "@/contracts/convert";
import { env } from "@/config/env";
import { LIMITS } from "@/config/limits";
import { convertMarkdownToLatex } from "@/server/conversion/convert-markdown";
import { readJsonBody } from "@/server/http/read-json";

/** UTF-8 uses at most four bytes per character; the rest is room for the JSON envelope. */
const MAX_BODY_BYTES = LIMITS.maxMarkdownLength * 4 + 1024;

const STATUS_BY_ERROR: Readonly<Record<ConversionErrorCode, number>> = {
  "invalid-request": 400,
  "too-large": 413,
  syntax: 422,
  "limit-exceeded": 422,
  busy: 503,
  unavailable: 503,
  failed: 500,
};

function respond(body: ConvertResponse): Response {
  return Response.json(body, {
    status: body.ok ? 200 : STATUS_BY_ERROR[body.error.code],
    headers: { "Cache-Control": "no-store" },
  });
}

const TOO_LARGE: ConvertResponse = {
  ok: false,
  error: {
    code: "too-large",
    message: "El documento es demasiado largo para convertirlo.",
  },
};

const INVALID: ConvertResponse = {
  ok: false,
  error: { code: "invalid-request", message: "La petición de conversión no es válida." },
};

export async function POST(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return respond(INVALID);
  }
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return respond(body.reason === "too-large" ? TOO_LARGE : INVALID);

  const parsed = convertRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.code === "too_big");
    return respond(tooLong ? TOO_LARGE : INVALID);
  }

  return respond(await convertMarkdownToLatex(parsed.data, env.PANDOC_PATH));
}
