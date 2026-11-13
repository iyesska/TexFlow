"use client";

import {
  createContext,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { LOCAL_DOCUMENT_ID } from "@/features/document/model/document";

import {
  createAssetLibrary,
  type AssetLibrary,
  type AssetMap,
} from "../model/asset-library";
import { createIndexedDbAssetStore } from "../model/asset-store";

const AssetLibraryContext = createContext<AssetLibrary | null>(null);

function createLocalLibrary(): AssetLibrary {
  return createAssetLibrary({
    documentId: LOCAL_DOCUMENT_ID,
    store: createIndexedDbAssetStore(() => window.indexedDB),
  });
}

/** Makes the open document's images available to everything rendered inside. */
export function AssetLibraryProvider({ children }: { children: ReactNode }) {
  const [library] = useState(createLocalLibrary);

  useEffect(() => {
    void library.load();
  }, [library]);

  return <AssetLibraryContext value={library}>{children}</AssetLibraryContext>;
}

export function useAssetLibrary(): AssetLibrary {
  const library = use(AssetLibraryContext);
  if (!library) {
    throw new Error("useAssetLibrary must be used inside <AssetLibraryProvider>.");
  }
  return library;
}

const NO_ASSETS: AssetMap = new Map();

/** The document's images by name. Re-renders when one is added. */
export function useAssets(): AssetMap {
  const library = useAssetLibrary();
  return useSyncExternalStore(library.subscribe, library.getSnapshot, () => NO_ASSETS);
}
