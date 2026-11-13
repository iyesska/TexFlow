"use client";

import { useEffect, useReducer, useState } from "react";

import type { ConversionError } from "@/contracts/convert";

import { requestConversion } from "../model/conversion-client";

/** Quiet time after the last edit before asking the server again. */
const DEBOUNCE_MS = 350;
const BUSY_RETRY_MS = 2000;

export interface LatexConversion {
  /** The latest LaTeX the server produced, kept on screen while a newer one loads. */
  readonly latex: string | null;
  readonly warnings: readonly string[];
  /** Why the most recent attempt failed, if it did. */
  readonly error: ConversionError | null;
  /**
   * True from the moment the document or the options change until the server has
   * answered for them. While pending, `latex` belongs to an older version.
   */
  readonly isPending: boolean;
  retry(): void;
}

/** Identifies one conversion request, so an answer can be matched to what was asked. */
interface ConversionInput {
  readonly markdown: string;
  readonly standalone: boolean;
  readonly attempt: number;
}

interface ConversionState {
  readonly latex: string | null;
  readonly warnings: readonly string[];
  readonly error: ConversionError | null;
  /** The input the server last answered for, successfully or not. */
  readonly answered: ConversionInput | null;
}

const INITIAL_STATE: ConversionState = {
  latex: null,
  warnings: [],
  error: null,
  answered: null,
};

function sameInput(a: ConversionInput | null, b: ConversionInput): boolean {
  return (
    a !== null &&
    a.markdown === b.markdown &&
    a.standalone === b.standalone &&
    a.attempt === b.attempt
  );
}

/**
 * Keeps the LaTeX in step with the Markdown: converts after each pause in typing and
 * drops answers that a newer edit has made stale. `markdown` is null until the
 * document has loaded.
 */
export function useLatexConversion(
  markdown: string | null,
  standalone: boolean,
): LatexConversion {
  const [state, setState] = useState(INITIAL_STATE);
  const [attempt, retry] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (markdown === null) return;
    const input: ConversionInput = { markdown, standalone, attempt };
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const convert = async () => {
      const result = await requestConversion({ markdown, standalone }, controller.signal);
      if (controller.signal.aborted) return;

      if (result.ok) {
        setState({
          latex: result.latex,
          warnings: result.warnings,
          error: null,
          answered: input,
        });
        return;
      }
      setState((current) => ({ ...current, error: result.error, answered: input }));
      if (result.error.code === "busy") retryTimer = setTimeout(retry, BUSY_RETRY_MS);
    };

    // The first conversion and explicit retries start at once; edits wait for a pause.
    const isFirst = state.answered === null;
    const isRetry = state.answered?.attempt !== attempt;
    const timer = setTimeout(() => void convert(), isFirst || isRetry ? 0 : DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      controller.abort();
    };
    // `state.answered` only picks the delay; it must not restart the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, standalone, attempt]);

  const isPending =
    markdown !== null && !sameInput(state.answered, { markdown, standalone, attempt });

  return {
    latex: state.latex,
    warnings: state.warnings,
    error: state.error,
    isPending,
    retry,
  };
}
