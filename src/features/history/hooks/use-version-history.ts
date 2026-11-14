"use client";

import { useCallback, useEffect, useState } from "react";

import type { VersionDto, VersionSummaryDto } from "@/contracts/documents";

import { fetchVersion, fetchVersions } from "../model/history-api";

export type ListState =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "ready"; readonly versions: readonly VersionSummaryDto[] };

export type ContentState =
  | { readonly status: "ready"; readonly version: VersionDto }
  | { readonly status: "failed"; readonly message: string };

/** The document's versions, read when the history opens. */
export function useVersionList(documentId: string) {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchVersions(documentId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setList(
        result.ok
          ? { status: "ready", versions: result.value }
          : { status: "failed", message: result.message },
      );
    });
    return () => controller.abort();
  }, [documentId, attempt]);

  const retry = useCallback(() => {
    setList({ status: "loading" });
    setAttempt((count) => count + 1);
  }, []);

  /** Shows a version just kept, at the top, without reading the list again. */
  const prepend = useCallback((version: VersionSummaryDto) => {
    setList((current) =>
      current.status === "ready"
        ? { status: "ready", versions: [version, ...current.versions] }
        : current,
    );
  }, []);

  return { list, retry, prepend };
}

/**
 * The content of the chosen version, read the first time it is chosen and kept while
 * the history is open. Undefined while it is being read.
 */
export function useVersionContent(documentId: string, versionId: string | null) {
  const [contents, setContents] = useState<ReadonlyMap<string, ContentState>>(new Map());

  useEffect(() => {
    if (!versionId || contents.has(versionId)) return;
    const controller = new AbortController();
    void fetchVersion(documentId, versionId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setContents((current) =>
        new Map(current).set(
          versionId,
          result.ok
            ? { status: "ready", version: result.value }
            : { status: "failed", message: result.message },
        ),
      );
    });
    return () => controller.abort();
  }, [documentId, versionId, contents]);

  const retry = useCallback(() => {
    if (!versionId) return;
    setContents((current) => {
      const next = new Map(current);
      next.delete(versionId);
      return next;
    });
  }, [versionId]);

  return { content: versionId ? contents.get(versionId) : undefined, retry };
}
