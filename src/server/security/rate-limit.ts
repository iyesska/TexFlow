import "server-only";

/**
 * A fixed-window rate limiter kept in memory. Enough for a single server process; a
 * deployment with several processes needs a shared store (see docs/architecture.md).
 */
export interface RateLimiter {
  /** Counts one attempt for `key`; false when the key has used up its window. */
  take(key: string): boolean;
  /** Forgets `key`, e.g. after a successful sign-in. */
  reset(key: string): void;
}

interface Window {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

export function createRateLimiter(options: {
  readonly limit: number;
  readonly windowMs: number;
  readonly now?: () => number;
}): RateLimiter {
  const { limit, windowMs, now = Date.now } = options;
  const windows = new Map<string, Window>();

  const prune = (time: number) => {
    for (const [key, window] of windows) if (window.resetAt <= time) windows.delete(key);
  };

  return {
    take(key) {
      const time = now();
      const current = windows.get(key);
      if (!current || current.resetAt <= time) {
        if (windows.size >= MAX_TRACKED_KEYS) prune(time);
        windows.set(key, { count: 1, resetAt: time + windowMs });
        return true;
      }
      current.count++;
      return current.count <= limit;
    },
    reset(key) {
      windows.delete(key);
    },
  };
}
