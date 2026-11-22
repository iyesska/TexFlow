"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { bibliographyFor } from "@/documents/bibtex";
import { useCompilation } from "@/features/compilation/hooks/use-compilation";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import { settingsKey } from "@/templates/settings";

import {
  createFirstStepsStore,
  type FirstStep,
  type FirstStepsProgress,
  type FirstStepsStore,
} from "../model/first-steps";

const FirstStepsContext = createContext<FirstStepsStore | null>(null);

/** Keeps the first-steps guide's progress for the signed-in account. */
export function FirstStepsProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createFirstStepsStore(
      typeof window === "undefined" ? null : window.localStorage,
      userId,
    ),
  );
  return <FirstStepsContext value={store}>{children}</FirstStepsContext>;
}

function useStore(): FirstStepsStore {
  const store = use(FirstStepsContext);
  if (!store) throw new Error("useFirstSteps must be used inside <FirstStepsProvider>.");
  return store;
}

/**
 * The guide's progress, and the ways to change it. The progress is null until the
 * page runs in the browser, where it is kept: nothing is shown before it is known.
 */
export function useFirstSteps(): {
  readonly progress: FirstStepsProgress | null;
  readonly store: FirstStepsStore;
} {
  const store = useStore();
  const progress = useSyncExternalStore(store.subscribe, store.getSnapshot, () => null);
  return { progress, store };
}

/** Marks a step done. Does nothing outside the workspace, where there is no guide. */
export function useCompleteStep(): (step: FirstStep) => void {
  const store = use(FirstStepsContext);
  return useCallback((step: FirstStep) => store?.complete(step), [store]);
}

/**
 * Ticks off the steps the writer does in the document itself: writing, choosing a
 * design, citing a reference and compiling. Renders nothing.
 */
export function FirstStepsTracker() {
  const store = useStore();
  const session = useDocumentSession();
  const { pdf } = useCompilation();

  useEffect(() => {
    const initialDesign = settingsKey(session.getSnapshot().settings);
    const check = () => {
      const { status, settings, markdown, bibliography } = session.getSnapshot();
      const { done } = store.getSnapshot();
      if (!done.includes("write") && (status === "unsaved" || status === "saving")) {
        store.complete("write");
      }
      if (!done.includes("design") && settingsKey(settings) !== initialDesign) {
        store.complete("design");
      }
      // A citation of a reference the document has: its bibliography is not empty.
      if (!done.includes("cite") && bibliographyFor(markdown, bibliography) !== "") {
        store.complete("cite");
      }
    };
    check();
    return session.subscribe(check);
  }, [session, store]);

  useEffect(() => {
    if (pdf) store.complete("pdf");
  }, [pdf, store]);

  return null;
}
