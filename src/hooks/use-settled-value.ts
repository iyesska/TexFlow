"use client";

import { useEffect, useState } from "react";

/**
 * `value` once it has stopped changing for `delayMs`: what was typed, rather than
 * every keystroke of it. Starts with the first value, at once.
 */
export function useSettledValue<Value>(value: Value, delayMs: number): Value {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    if (Object.is(value, settled)) return;
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, settled, delayMs]);

  return settled;
}
