"use client";

import { useSyncExternalStore } from "react";

/** The platform never changes while the page is open: nothing to listen to. */
const subscribe = () => () => undefined;

/** Whether shortcuts should be shown with Mac key symbols. False on the server. */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
}
