"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { CompileFailure, Diagnostic } from "@/contracts/compilation";
import { imagesUsedBy } from "@/documents/used-images";
import { useAssetLibrary, useAssets } from "@/features/assets/hooks/use-assets";
import { bibliographyFor } from "@/documents/bibtex";
import {
  useDocumentBibliography,
  useDocumentMarkdown,
  useDocumentSession,
  useDocumentSettings,
} from "@/features/document/hooks/use-document";
import { fingerprint } from "@/lib/fingerprint";
import { settingsKey } from "@/templates/settings";

import {
  requestCompilation,
  type CompilationOutcome,
} from "../model/request-compilation";
import { compilationKey } from "../model/used-images";

/** Which rendering of the document the preview pane shows. */
export type PreviewMode = "quick" | "pdf";

interface CompilationState {
  readonly isCompiling: boolean;
  /** The most recent PDF that compiled, kept while a newer one is produced. */
  readonly pdf: Uint8Array | null;
  /** Why the most recent compile failed, if it did. */
  readonly error: CompileFailure["error"] | null;
  readonly warnings: readonly Diagnostic[];
  /** Identifies the document the last finished compile ran on. */
  readonly compiledKey: string | null;
}

interface Compilation extends CompilationState {
  /** True when the document has changed since the last finished compile. */
  readonly isStale: boolean;
  /** True when the last compile failed and its problems are what should be shown. */
  readonly hasProblems: boolean;
  readonly mode: PreviewMode;
  setMode(mode: PreviewMode): void;
  /** Compiles the document as it is now. Resolves to null if a newer compile replaced it. */
  compile(): Promise<CompilationOutcome | null>;
}

const INITIAL_STATE: CompilationState = {
  isCompiling: false,
  pdf: null,
  error: null,
  warnings: [],
  compiledKey: null,
};

const CompilationContext = createContext<Compilation | null>(null);

/** Owns the compiled PDF, so the preview and the export menu share one result. */
export function CompilationProvider({ children }: { children: ReactNode }) {
  const session = useDocumentSession();
  const library = useAssetLibrary();
  const markdown = useDocumentMarkdown();
  const settings = useDocumentSettings();
  const bibliography = useDocumentBibliography();
  const assets = useAssets();
  const [state, setState] = useState(INITIAL_STATE);
  const [mode, setMode] = useState<PreviewMode>("quick");
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const compile = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    const { markdown: text, settings: design, bibliography } = session.getSnapshot();
    const images = imagesUsedBy(text, library.getSnapshot().values());
    const key = compilationKey(
      text,
      images.map(({ name }) => name),
      `${settingsKey(design)}:${fingerprint(bibliography)}`,
    );

    setState((current) => ({ ...current, isCompiling: true }));
    const outcome = await requestCompilation(
      {
        markdown: text,
        settings: design,
        documentId: session.id,
        bibliography: bibliographyFor(text, bibliography),
      },
      controller.signal,
    );
    if (controller.signal.aborted) return null;

    setState((current) =>
      outcome.ok
        ? {
            isCompiling: false,
            pdf: outcome.pdf,
            error: null,
            warnings: outcome.warnings,
            compiledKey: key,
          }
        : {
            ...current,
            isCompiling: false,
            error: outcome.error,
            // Warnings belong to a PDF that compiled; this one did not.
            warnings: [],
            compiledKey: key,
          },
    );
    return outcome;
  }, [library, session]);

  const value = useMemo<Compilation>(() => {
    const currentKey = compilationKey(
      markdown,
      imagesUsedBy(markdown, assets.values()).map(({ name }) => name),
      `${settingsKey(settings)}:${fingerprint(bibliography)}`,
    );
    const isStale = state.compiledKey !== currentKey;
    const hasProblems = state.error !== null && !state.isCompiling && !isStale;
    return { ...state, isStale, hasProblems, mode, setMode, compile };
  }, [assets, bibliography, compile, markdown, mode, settings, state]);

  return <CompilationContext value={value}>{children}</CompilationContext>;
}

export function useCompilation(): Compilation {
  const compilation = use(CompilationContext);
  if (!compilation) {
    throw new Error("useCompilation must be used inside <CompilationProvider>.");
  }
  return compilation;
}
