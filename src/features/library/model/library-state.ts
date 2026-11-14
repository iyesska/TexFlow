import type { DocumentSummaryDto, FolderDto } from "@/contracts/documents";

/** The signed-in user's documents and folders, as the library shows them. */
export interface LibraryState {
  readonly documents: readonly DocumentSummaryDto[];
  readonly folders: readonly FolderDto[];
}

export type LibraryAction =
  | { readonly type: "replaced"; readonly state: LibraryState }
  | { readonly type: "documentAdded"; readonly document: DocumentSummaryDto }
  | { readonly type: "documentChanged"; readonly document: DocumentSummaryDto }
  | { readonly type: "documentRemoved"; readonly id: string }
  | { readonly type: "folderAdded"; readonly folder: FolderDto }
  | { readonly type: "folderRenamed"; readonly id: string; readonly name: string }
  | { readonly type: "folderRemoved"; readonly id: string };

const byName = (a: FolderDto, b: FolderDto) => a.name.localeCompare(b.name, "es");

export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case "replaced":
      return action.state;
    case "documentAdded":
      return { ...state, documents: [action.document, ...state.documents] };
    case "documentChanged":
      return {
        ...state,
        documents: state.documents.map((document) =>
          document.id === action.document.id ? action.document : document,
        ),
      };
    case "documentRemoved":
      return {
        ...state,
        documents: state.documents.filter(({ id }) => id !== action.id),
      };
    case "folderAdded":
      return { ...state, folders: [...state.folders, action.folder].sort(byName) };
    case "folderRenamed":
      return {
        ...state,
        folders: state.folders
          .map((folder) =>
            folder.id === action.id ? { ...folder, name: action.name } : folder,
          )
          .sort(byName),
      };
    case "folderRemoved":
      // The folder's documents stay, outside any folder, as on the server.
      return {
        folders: state.folders.filter(({ id }) => id !== action.id),
        documents: state.documents.map((document) =>
          document.folderId === action.id ? { ...document, folderId: null } : document,
        ),
      };
  }
}

/** Which documents the list shows. */
export type LibraryView =
  | { readonly kind: "all" }
  | { readonly kind: "unfiled" }
  | { readonly kind: "folder"; readonly id: string };

/** Lower-cased and without accents: "Análisis" is found by "analisis". */
export function searchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

/** The documents in `view` whose title contains `query`, most recently changed first. */
export function visibleDocuments(
  state: LibraryState,
  view: LibraryView,
  query: string,
): DocumentSummaryDto[] {
  const needle = searchKey(query.trim());
  return state.documents
    .filter((document) => {
      if (view.kind === "unfiled" && document.folderId !== null) return false;
      if (view.kind === "folder" && document.folderId !== view.id) return false;
      return needle === "" || searchKey(document.title).includes(needle);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** How many documents each folder holds, counted from the documents themselves. */
export function documentCounts(state: LibraryState): {
  readonly all: number;
  readonly unfiled: number;
  readonly byFolder: ReadonlyMap<string, number>;
} {
  const byFolder = new Map<string, number>();
  let unfiled = 0;
  for (const { folderId } of state.documents) {
    if (folderId === null) unfiled++;
    else byFolder.set(folderId, (byFolder.get(folderId) ?? 0) + 1);
  }
  return { all: state.documents.length, unfiled, byFolder };
}

/** "1 documento", "12 documentos". */
export function documentCount(count: number): string {
  return count === 1 ? "1 documento" : `${count.toLocaleString("es")} documentos`;
}
