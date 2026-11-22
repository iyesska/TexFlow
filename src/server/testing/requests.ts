/** Requests and route contexts for calling route handlers directly in tests. */

const ORIGIN = "http://localhost";

export function apiRequest(
  method: string,
  path: string,
  options: { readonly json?: unknown; readonly headers?: Record<string, string> } = {},
): Request {
  const hasBody = options.json !== undefined;
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      // What a browser sends from the application's own pages.
      ...(method === "GET" ? {} : { origin: ORIGIN, host: "localhost" }),
      ...options.headers,
    },
    body: hasBody ? JSON.stringify(options.json) : undefined,
  });
}

export function uploadRequest(path: string, field: string, file: File): Request {
  const form = new FormData();
  form.set(field, file);
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { origin: ORIGIN, host: "localhost" },
    body: form,
  });
}

export function routeContext<Params extends Record<string, string>>(params: Params) {
  return { params: Promise.resolve(params) };
}
