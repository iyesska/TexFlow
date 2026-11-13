import "server-only";

/** Limits how many jobs run at once, so a burst of requests cannot exhaust the host. */
export interface Semaphore {
  /**
   * Runs `job` when a slot is free. Resolves to `null` without running it when no slot
   * frees up within `maxWaitMs`.
   */
  run<T>(job: () => Promise<T>, maxWaitMs: number): Promise<T | null>;
}

export function createSemaphore(slots: number): Semaphore {
  let free = slots;
  const waiting: Array<(acquired: boolean) => void> = [];

  const acquire = (maxWaitMs: number): Promise<boolean> => {
    if (free > 0) {
      free--;
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const entry = (acquired: boolean) => {
        clearTimeout(timer);
        resolve(acquired);
      };
      const timer = setTimeout(() => {
        waiting.splice(waiting.indexOf(entry), 1);
        resolve(false);
      }, maxWaitMs);
      waiting.push(entry);
    });
  };

  const release = () => {
    const next = waiting.shift();
    // Hand the slot straight to the next waiter instead of freeing it.
    if (next) next(true);
    else free++;
  };

  return {
    async run(job, maxWaitMs) {
      if (!(await acquire(maxWaitMs))) return null;
      try {
        return await job();
      } finally {
        release();
      }
    },
  };
}
