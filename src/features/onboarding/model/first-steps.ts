import { z } from "zod";

/**
 * The first-steps guide: the few things that show what TexFlow does, ticked off as
 * the writer does them. Progress is kept in the browser, per account.
 */

export const FIRST_STEPS = [
  "write",
  "design",
  "cite",
  "pdf",
  "export",
  "commands",
] as const;

export type FirstStep = (typeof FIRST_STEPS)[number];

export interface FirstStepsProgress {
  readonly done: readonly FirstStep[];
  /** The writer put the guide away. */
  readonly dismissed: boolean;
}

const progressSchema = z.object({
  done: z.array(z.enum(FIRST_STEPS)),
  dismissed: z.boolean(),
});

export const NO_PROGRESS: FirstStepsProgress = { done: [], dismissed: false };

const storageKey = (userId: string) => `texflow:first-steps:${userId}`;

/** The progress kept for an account; none when nothing valid is kept. */
export function readProgress(
  storage: Storage | null,
  userId: string,
): FirstStepsProgress {
  try {
    const raw = storage?.getItem(storageKey(userId));
    if (!raw) return NO_PROGRESS;
    const parsed = progressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : NO_PROGRESS;
  } catch {
    return NO_PROGRESS;
  }
}

export function writeProgress(
  storage: Storage | null,
  userId: string,
  progress: FirstStepsProgress,
): void {
  try {
    storage?.setItem(storageKey(userId), JSON.stringify(progress));
  } catch {
    // Storage can be full or blocked; the guide then forgets, which is harmless.
  }
}

/** The progress with one more step done, in the guide's order. */
export function withStep(
  progress: FirstStepsProgress,
  step: FirstStep,
): FirstStepsProgress {
  if (progress.done.includes(step)) return progress;
  const done = FIRST_STEPS.filter(
    (each) => each === step || progress.done.includes(each),
  );
  return { ...progress, done };
}

export const isComplete = (progress: FirstStepsProgress) =>
  FIRST_STEPS.every((step) => progress.done.includes(step));

export interface FirstStepsStore {
  getSnapshot(): FirstStepsProgress;
  subscribe(listener: () => void): () => void;
  complete(step: FirstStep): void;
  dismiss(): void;
  /** Brings the guide back after it was put away. */
  show(): void;
}

/** The guide's progress for one account, kept in `storage` as it changes. */
export function createFirstStepsStore(
  storage: Storage | null,
  userId: string,
): FirstStepsStore {
  let progress = readProgress(storage, userId);
  const listeners = new Set<() => void>();
  const set = (next: FirstStepsProgress) => {
    if (next === progress) return;
    progress = next;
    writeProgress(storage, userId, progress);
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => progress,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    complete: (step) => set(withStep(progress, step)),
    dismiss: () => set(progress.dismissed ? progress : { ...progress, dismissed: true }),
    show: () => set(progress.dismissed ? { ...progress, dismissed: false } : progress),
  };
}
