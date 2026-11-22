"use client";

import { useEffect } from "react";

/**
 * Keeps the browser tab's title at `title`. The page's own <title> can arrive or
 * change after this runs: streamed into <body> with the page's metadata, hoisted into
 * <head> by React, or set back by React while it hydrates. Every <title>, and every
 * new one, is watched, and the wanted title goes back whenever one changes.
 */
export function useTabTitle(title: string): void {
  useEffect(() => {
    const watched = new Set<Element>();
    const observer = new MutationObserver(() => sync());
    function sync() {
      for (const element of document.querySelectorAll("title")) {
        if (watched.has(element)) continue;
        watched.add(element);
        observer.observe(element, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }
      if (document.title !== title) document.title = title;
    }
    // New <title> elements land as children of one or the other.
    observer.observe(document.head, { childList: true });
    observer.observe(document.body, { childList: true });
    sync();
    return () => observer.disconnect();
  }, [title]);
}
