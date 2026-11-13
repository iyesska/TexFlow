"use client";

import { useCallback, useState } from "react";

/**
 * Tracks an element's content width. Attach `ref` to the element; `width` is null
 * until it has been measured.
 */
export function useElementWidth<T extends Element>(): {
  ref: (element: T | null) => (() => void) | undefined;
  width: number | null;
} {
  const [width, setWidth] = useState<number | null>(null);

  const ref = useCallback((element: T | null) => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
