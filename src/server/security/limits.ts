import "server-only";

import { createRateLimiter } from "./rate-limit";

/**
 * How often each user may ask the server to run Pandoc or LaTeX. The conversions run
 * on every pause in typing, so their allowance is generous; compiling is the heaviest
 * thing the server does.
 */
export const conversionRequests = createRateLimiter({ limit: 240, windowMs: 60_000 });
export const compileRequests = createRateLimiter({ limit: 20, windowMs: 60_000 });

/** Saves, uploads and library changes. Autosave writes about once a second at most. */
export const documentWrites = createRateLimiter({ limit: 300, windowMs: 60_000 });
