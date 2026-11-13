"use client";

import { useEffect, useEffectEvent, useReducer, useState } from "react";

import type { ConversionError, ConversionFailure } from "@/contracts/conversion";

/** Quiet time after the last edit before asking the server again. */
const DEBOUNCE_MS = 350;
const BUSY_RETRY_MS = 2000;

export type ConversionOutcome<Value> =
  | { readonly ok: true; readonly value: Value; readonly warnings: readonly string[] }
  | ConversionFailure;

export interface Conversion<Value> {
  /** The latest result the server produced, kept on screen while a newer one loads. */
  readonly value: Value | null;
  readonly warnings: readonly string[];
  /** Why the most recent attempt failed, if it did. */
  readonly error: ConversionError | null;
  /**
   * True from the moment the document or the options change until the server has
   * answered for them. While pending, `value` belongs to an older version.
   */
  readonly isPending: boolean;
  retry(): void;
}

/** Identifies one request, so an answer can be matched to what was asked. */
interface ConversionInput {
  readonly markdown: string;
  readonly variant: string;
  readonly attempt: number;
}

interface ConversionState<Value> {
  readonly value: Value | null;
  readonly warnings: readonly string[];
  readonly error: ConversionError | null;
  /** The input the server last answered for, successfully or not. */
  readonly answered: ConversionInput | null;
}

function sameInput(a: ConversionInput | null, b: ConversionInput): boolean {
  return (
    a !== null &&
    a.markdown === b.markdown &&
    a.variant === b.variant &&
    a.attempt === b.attempt
  );
}

/**
 * Keeps a server-side conversion in step with the Markdown: runs after each pause in
 * typing and drops answers that a newer edit has made stale.
 *
 * @param markdown The document, or null until it has loaded.
 * @param variant Names the options in force (e.g. "body"); a change re-runs the conversion.
 * @param run Performs the request for the current options.
 */
export function useConversion<Value>(
  markdown: string | null,
  variant: string,
  run: (markdown: string, signal: AbortSignal) => Promise<ConversionOutcome<Value>>,
): Conversion<Value> {
  const [state, setState] = useState<ConversionState<Value>>({
    value: null,
    warnings: [],
    error: null,
    answered: null,
  });
  const [attempt, retry] = useReducer((count: number) => count + 1, 0);
  const runLatest = useEffectEvent(run);
  // The first conversion and explicit retries start at once; edits wait for a pause.
  const delay = useEffectEvent(() =>
    state.answered === null || state.answered.attempt !== attempt ? 0 : DEBOUNCE_MS,
  );

  useEffect(() => {
    if (markdown === null) return;
    const input: ConversionInput = { markdown, variant, attempt };
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const convert = async () => {
      const outcome = await runLatest(markdown, controller.signal);
      if (controller.signal.aborted) return;

      if (outcome.ok) {
        setState({
          value: outcome.value,
          warnings: outcome.warnings,
          error: null,
          answered: input,
        });
        return;
      }
      setState((current) => ({ ...current, error: outcome.error, answered: input }));
      if (outcome.error.code === "busy") retryTimer = setTimeout(retry, BUSY_RETRY_MS);
    };

    const timer = setTimeout(() => void convert(), delay());
    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      controller.abort();
    };
  }, [markdown, variant, attempt]);

  const isPending =
    markdown !== null && !sameInput(state.answered, { markdown, variant, attempt });

  return {
    value: state.value,
    warnings: state.warnings,
    error: state.error,
    isPending,
    retry,
  };
}
