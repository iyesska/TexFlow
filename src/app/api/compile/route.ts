import {
  ASSET_LIMITS,
  ASSET_NAME_PATTERN,
  ASSET_TYPES,
  detectAssetType,
} from "@/contracts/assets";
import { COMPILE_FIELDS, COMPILE_WARNINGS_HEADER } from "@/contracts/compilation";
import { env } from "@/config/env";
import { LIMITS } from "@/config/limits";
import {
  compileDocument,
  type CompileImage,
} from "@/server/compilation/compile-document";
import { INVALID, respond, TOO_LARGE } from "@/server/http/json-route";
import { readBodyBytes } from "@/server/http/read-body";
import { DEFAULT_SETTINGS } from "@/templates/catalog";
import { documentSettingsSchema, type DocumentSettings } from "@/templates/settings";

/** Headers have a size limit of their own; warnings beyond it are dropped. */
const MAX_WARNINGS_HEADER_LENGTH = 6000;

/**
 * Checks one uploaded image: its name must be one the application generates (so it can
 * be used as a file name), and its content must be the format the name claims.
 */
async function readImage(file: File): Promise<CompileImage | null> {
  if (!ASSET_NAME_PATTERN.test(file.name) || file.size > ASSET_LIMITS.maxBytes)
    return null;
  const data = new Uint8Array(await file.arrayBuffer());
  const type = detectAssetType(data);
  if (type === null || !file.name.endsWith(`.${ASSET_TYPES[type]}`)) return null;
  return { name: file.name, data };
}

/** The design settings field: absent means the default template, malformed is refused. */
function readSettings(field: FormDataEntryValue | null): DocumentSettings | null {
  if (field === null) return DEFAULT_SETTINGS;
  if (typeof field !== "string") return null;
  try {
    const parsed = documentSettingsSchema.safeParse(JSON.parse(field));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

interface CompileForm {
  readonly markdown: string;
  readonly images: CompileImage[];
  readonly settings: DocumentSettings;
}

async function readForm(
  request: Request,
): Promise<CompileForm | "too-large" | "invalid"> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) return "invalid";

  const body = await readBodyBytes(request, LIMITS.maxCompileBodyBytes);
  if ("reason" in body) return body.reason === "too-large" ? "too-large" : "invalid";

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(body.bytes), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    return "invalid";
  }

  const markdown = form.get(COMPILE_FIELDS.markdown);
  if (typeof markdown !== "string") return "invalid";
  if (markdown.length > LIMITS.maxMarkdownLength) return "too-large";

  const settings = readSettings(form.get(COMPILE_FIELDS.settings));
  if (settings === null) return "invalid";

  const files = form.getAll(COMPILE_FIELDS.image);
  if (files.length > ASSET_LIMITS.maxPerDocument) return "invalid";
  const images: CompileImage[] = [];
  for (const file of files) {
    const image = file instanceof File ? await readImage(file) : null;
    if (image === null || images.some(({ name }) => name === image.name))
      return "invalid";
    images.push(image);
  }
  return { markdown, images, settings };
}

/** Compiles a Markdown document, with its images, to PDF. */
export async function POST(request: Request): Promise<Response> {
  const form = await readForm(request);
  if (form === "too-large") return respond(TOO_LARGE);
  if (form === "invalid") return respond(INVALID);

  const result = await compileDocument(
    form.markdown,
    form.images,
    form.settings,
    {
      pandocPath: env.PANDOC_PATH,
      tectonicPath: env.TECTONIC_PATH,
      cacheDir: env.TECTONIC_CACHE_DIR,
    },
    request.signal,
  );
  if (!result.ok) return respond(result);

  const warnings = encodeURIComponent(JSON.stringify(result.warnings));
  return new Response(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      [COMPILE_WARNINGS_HEADER]:
        warnings.length <= MAX_WARNINGS_HEADER_LENGTH ? warnings : "[]",
    },
  });
}
