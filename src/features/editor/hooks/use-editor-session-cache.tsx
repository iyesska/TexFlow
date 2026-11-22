"use client";

import { createContext, use, useState, type ReactNode } from "react";

import {
  createEditorSessionCache,
  type EditorSessionCache,
} from "../codemirror/session-cache";

const EditorSessionCacheContext = createContext<EditorSessionCache | null>(null);

/** Lets the editor keep its cursor and undo history across being hidden and shown. */
export function EditorSessionCacheProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(createEditorSessionCache);
  return <EditorSessionCacheContext value={cache}>{children}</EditorSessionCacheContext>;
}

export function useEditorSessionCache(): EditorSessionCache {
  const cache = use(EditorSessionCacheContext);
  if (!cache) {
    throw new Error(
      "useEditorSessionCache must be used inside <EditorSessionCacheProvider>.",
    );
  }
  return cache;
}
