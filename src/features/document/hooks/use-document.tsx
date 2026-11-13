"use client";

import {
  createContext,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { DEFAULT_SETTINGS } from "@/templates/catalog";
import type { DocumentSettings } from "@/templates/settings";

import { LOCAL_DOCUMENT_ID } from "../model/document";
import {
  createDocumentSession,
  type DocumentSession,
  type SaveStatus,
} from "../model/document-session";
import { createLocalDocumentStore } from "../model/document-store";
import { SAMPLE_DOCUMENT } from "../model/sample-document";

const AUTOSAVE_DELAY_MS = 800;

const DocumentSessionContext = createContext<DocumentSession | null>(null);

function createLocalSession(): DocumentSession {
  return createDocumentSession({
    id: LOCAL_DOCUMENT_ID,
    store: createLocalDocumentStore(() => window.localStorage),
    initialMarkdown: SAMPLE_DOCUMENT,
    initialSettings: DEFAULT_SETTINGS,
    autosaveDelayMs: AUTOSAVE_DELAY_MS,
  });
}

/** Opens the document and keeps it saved for everything rendered inside. */
export function DocumentProvider({ children }: { children: ReactNode }) {
  const [session] = useState(createLocalSession);

  useEffect(() => {
    void session.load();
    // Leaving or hiding the page must not lose the last few keystrokes.
    const flush = () => void session.flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
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

const SERVER_STATUS: SaveStatus = "loading";

export function useSaveStatus(): SaveStatus {
  const session = useDocumentSession();
  return useSyncExternalStore(
    session.subscribe,
    () => session.getSnapshot().status,
    () => SERVER_STATUS,
  );
}

/** The document's Markdown. Re-renders on every edit: use it sparingly. */
export function useDocumentMarkdown(): string {
  const session = useDocumentSession();
  return useSyncExternalStore(
    session.subscribe,
    () => session.getSnapshot().markdown,
    () => "",
  );
}

/** The document's design settings. Re-renders when the design changes. */
export function useDocumentSettings(): DocumentSettings {
  const session = useDocumentSession();
  return useSyncExternalStore(
    session.subscribe,
    () => session.getSnapshot().settings,
    () => DEFAULT_SETTINGS,
  );
}
