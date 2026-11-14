import "server-only";

/**
 * Whether a request that changes something comes from this application's own pages.
 * Browsers send `Origin` with every such request; one from another site is refused,
 * whatever cookies it carries. Requests without the header (not from a browser) are
 * let through: they carry no session cookie a browser would add on their behalf.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Methods that only read. */
export const isSafeMethod = (method: string) => method === "GET" || method === "HEAD";
