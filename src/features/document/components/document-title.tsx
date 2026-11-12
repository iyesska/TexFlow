"use client";

import { useDeferredValue, useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { useDocumentMarkdown, useSaveStatus } from "../hooks/use-document";
import { deriveTitle } from "../model/document";

/** The document's name, taken from its first heading. */
export function DocumentTitle() {
  const markdown = useDeferredValue(useDocumentMarkdown());
  const title = useMemo(() => deriveTitle(markdown), [markdown]);
  const isLoading = useSaveStatus() === "loading";

  if (isLoading) return <Skeleton className="h-3.5 w-36" />;
  return (
    <span className="truncate font-medium" title={title}>
      {title}
    </span>
  );
}
