import { describe, expect, it } from "vitest";

import type { DocumentSummaryDto } from "@/contracts/documents";

import {
  documentCounts,
  libraryReducer,
  searchKey,
  visibleDocuments,
  type LibraryState,
} from "./library-state";

const doc = (
  id: string,
  title: string,
  folderId: string | null,
  updatedAt: string,
): DocumentSummaryDto => ({
  id,
  title,
  titleSource: "content",
  folderId,
  templateId: "academic-paper",
  updatedAt,
});

const state: LibraryState = {
  folders: [
    { id: "f-tesis", name: "Tesis", documentCount: 1 },
    { id: "f-clases", name: "Clases", documentCount: 1 },
  ],
  documents: [
    doc("a", "Análisis de datos", "f-tesis", "2026-11-01T10:00:00Z"),
    doc("b", "Apuntes de álgebra", "f-clases", "2026-11-03T10:00:00Z"),
    doc("c", "Borrador", null, "2026-11-02T10:00:00Z"),
  ],
};

const ids = (documents: DocumentSummaryDto[]) => documents.map(({ id }) => id);

describe("visibleDocuments", () => {
  it("lists every document, most recently changed first", () => {
    expect(ids(visibleDocuments(state, { kind: "all" }, ""))).toEqual(["b", "c", "a"]);
  });

  it("shows one folder, or the documents outside any", () => {
    expect(ids(visibleDocuments(state, { kind: "folder", id: "f-tesis" }, ""))).toEqual([
      "a",
    ]);
    expect(ids(visibleDocuments(state, { kind: "unfiled" }, ""))).toEqual(["c"]);
  });

  it("finds titles regardless of accents and case", () => {
    expect(ids(visibleDocuments(state, { kind: "all" }, "ANALISIS"))).toEqual(["a"]);
    expect(ids(visibleDocuments(state, { kind: "all" }, " álge "))).toEqual(["b"]);
    expect(searchKey("Ñandú")).toBe("nandu");
  });
});

describe("libraryReducer", () => {
  it("keeps a deleted folder's documents, outside any folder", () => {
    const next = libraryReducer(state, { type: "folderRemoved", id: "f-tesis" });
    expect(next.folders.map(({ name }) => name)).toEqual(["Clases"]);
    expect(next.documents.find(({ id }) => id === "a")?.folderId).toBeNull();
  });

  it("keeps folders in alphabetical order", () => {
    const added = libraryReducer(state, {
      type: "folderAdded",
      folder: { id: "f-arte", name: "Arte", documentCount: 0 },
    });
    expect(added.folders.map(({ name }) => name)).toEqual(
      ["Arte", "Tesis", "Clases"].sort(),
    );
    const renamed = libraryReducer(added, {
      type: "folderRenamed",
      id: "f-arte",
      name: "Zoología",
    });
    expect(renamed.folders.at(-1)?.name).toBe("Zoología");
  });

  it("adds, changes and removes documents", () => {
    const added = libraryReducer(state, {
      type: "documentAdded",
      document: doc("d", "Nuevo", null, "2026-11-04T10:00:00Z"),
    });
    const moved = libraryReducer(added, {
      type: "documentChanged",
      document: doc("d", "Nuevo", "f-clases", "2026-11-04T10:00:00Z"),
    });
    expect(documentCounts(moved).byFolder.get("f-clases")).toBe(2);
    const removed = libraryReducer(moved, { type: "documentRemoved", id: "d" });
    expect(documentCounts(removed)).toMatchObject({ all: 3, unfiled: 1 });
  });
});
