"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Whether shortcuts should be shown with Mac key symbols. False on the server. */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
}
