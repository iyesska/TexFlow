/** Where a signed-in user lands when nothing else was asked for. */
export const HOME_PATH = "/documents";

const DOCUMENT_PATH = /^\/documents(?:\/[a-z0-9]{8,40})?\/?$/;

/** The path of `raw`: as it is when it is one, or taken from an absolute http(s) URL. */
function pathOf(raw: string): string | null {
  if (raw.startsWith("/")) return raw.split(/[?#]/, 1)[0] ?? null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.pathname : null;
  } catch {
    return null;
  }
}

/**
 * Where to send someone after they sign in: one of this application's document
 * pages. `raw` is a path, or the absolute URL Auth.js passes along; only its path is
 * kept, so the answer can never lead to another site.
 */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return HOME_PATH;
  const path = pathOf(raw);
  return path !== null && DOCUMENT_PATH.test(path) ? path : HOME_PATH;
}
