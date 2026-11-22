"use client";

import {
  createContext,
  use,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { DocumentDto } from "@/contracts/documents";
import { deriveTitle } from "@/documents/title";
import type { DocumentSettings } from "@/templates/settings";

import {
  canSaveWhileClosing,
  createApiDocumentStore,
  openedDocument,
} from "../model/api-document-store";
import {
  createDocumentSession,
  type DocumentSession,
  type SaveStatus,
} from "../model/document-session";
import {
  differsFrom,
  forgetPendingWork,
  keepPendingWork,
  readPendingWork,
} from "../model/pending-work";

const AUTOSAVE_DELAY_MS = 800;

const DocumentSessionContext = createContext<DocumentSession | null>(null);

function openSession(document: DocumentDto): DocumentSession {
  return createDocumentSession({
    id: document.id,
    store: createApiDocumentStore(document.id),
    initial: openedDocument(document),
    autosaveDelayMs: AUTOSAVE_DELAY_MS,
  });
}

/** Whether closing the page now could lose work the server does not have. */
function hasWorkAtRisk(session: DocumentSession): boolean {
  const { status, markdown } = session.getSnapshot();
  if (status === "saved") return false;
  if (status === "unsaved" || status === "saving") return !canSaveWhileClosing(markdown);
  return true;
}

/** Opens a document from the server and keeps it saved for everything inside. */
export function DocumentProvider({
  document,
  children,
}: {
  document: DocumentDto;
  children: ReactNode;
}) {
  const [session] = useState(() => openSession(document));

  // Work this tab had not saved when it last showed the document, after a reload.
  useEffect(() => {
    const kept = readPendingWork(window.sessionStorage, session.id);
    if (kept && differsFrom(kept, session.getSnapshot())) session.restore(kept);
    // The last save did arrive: the page already shows what was kept.
    else forgetPendingWork(window.sessionStorage, session.id);
    // Once the server has everything, there is nothing left to keep.
    return session.subscribe(() => {
      if (session.getSnapshot().status === "saved") {
        forgetPendingWork(window.sessionStorage, session.id);
      }
    });
  }, [session]);

  useEffect(() => {
    // Leaving or hiding the page must not lose the last few keystrokes: save them,
    // and keep them in the tab until the server confirms it has them.
    const leave = () => {
      const pending = session.pendingChange();
      if (pending) keepPendingWork(window.sessionStorage, session.id, pending);
      void session.flush();
    };
    const leaveWhenHidden = () => {
      if (window.document.visibilityState === "hidden") leave();
    };
    // Some work cannot be saved on the way out: ask before closing over it.
    const beforeUnload = (event: BeforeUnloadEvent) => {
      leave();
      if (hasWorkAtRisk(session)) event.preventDefault();
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("beforeunload", beforeUnload);
    window.document.addEventListener("visibilitychange", leaveWhenHidden);
    return () => {
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("beforeunload", beforeUnload);
      window.document.removeEventListener("visibilitychange", leaveWhenHidden);
      leave();
    };
  }, [session]);

  return <DocumentSessionContext value={session}>{children}</DocumentSessionContext>;
}

export function useDocumentSession(): DocumentSession {
  const session = use(DocumentSessionContext);
  if (!session) {
    throw new Error("useDocumentSession must be used inside <DocumentProvider>.");
  }
  return session;
}

/** Reads one part of the open document, re-rendering when it changes. */
function useSnapshotPart<Part>(
  read: (snapshot: ReturnType<DocumentSession["getSnapshot"]>) => Part,
): Part {
  const session = useDocumentSession();
  const get = () => read(session.getSnapshot());
  // The session is created from the server's copy, so the server renders it too.
  return useSyncExternalStore(session.subscribe, get, get);
}

export function useSaveStatus(): SaveStatus {
  return useSnapshotPart((snapshot) => snapshot.status);
}

/** The document's Markdown. Re-renders on every edit: use it sparingly. */
export function useDocumentMarkdown(): string {
  return useSnapshotPart((snapshot) => snapshot.markdown);
}

/** The document's design settings. Re-renders when the design changes. */
export function useDocumentSettings(): DocumentSettings {
  return useSnapshotPart((snapshot) => snapshot.settings);
}

/** The document's references, as BibTeX. Re-renders when they change. */
export function useDocumentBibliography(): string {
  return useSnapshotPart((snapshot) => snapshot.bibliography);
}

/** The document's title: the name the writer gave it, or its first heading. */
export function useDocumentTitle(): string {
  const manualTitle = useSnapshotPart((snapshot) => snapshot.manualTitle);
  const markdown = useDeferredValue(useDocumentMarkdown());
  return useMemo(() => manualTitle ?? deriveTitle(markdown), [manualTitle, markdown]);
}
