"use client";

import {
  createContext,
  use,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { AssetDto } from "@/contracts/documents";

import { createApiAssetStore } from "../model/api-asset-store";
import {
  createAssetLibrary,
  type AssetLibrary,
  type AssetMap,
} from "../model/asset-library";

const AssetLibraryContext = createContext<AssetLibrary | null>(null);

/** Makes the open document's images available to everything rendered inside. */
export function AssetLibraryProvider({
  documentId,
  assets,
  children,
}: {
  documentId: string;
  assets: readonly AssetDto[];
  children: ReactNode;
}) {
  const [library] = useState(() =>
    createAssetLibrary({ store: createApiAssetStore(documentId), initial: assets }),
  );
  return <AssetLibraryContext value={library}>{children}</AssetLibraryContext>;
}

export function useAssetLibrary(): AssetLibrary {
  const library = use(AssetLibraryContext);
  if (!library) {
    throw new Error("useAssetLibrary must be used inside <AssetLibraryProvider>.");
  }
  return library;
}

/** The document's images by name. Re-renders when one is added. */
export function useAssets(): AssetMap {
  const library = useAssetLibrary();
  return useSyncExternalStore(
    library.subscribe,
    library.getSnapshot,
    library.getSnapshot,
  );
}
