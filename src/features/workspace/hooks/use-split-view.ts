"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

/** Matches Tailwind's `md` breakpoint: below it the workspace shows one pane at a time. */
const SPLIT_VIEW_QUERY = "(min-width: 48rem)";

export function useSplitView(): boolean {
  return useMediaQuery(SPLIT_VIEW_QUERY, true);
}
