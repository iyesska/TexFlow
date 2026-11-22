"use client";

import type { DocumentSummaryDto, FolderDto } from "@/contracts/documents";
import type { TemplateId } from "@/templates/settings";

import type { LibraryView } from "../model/library-state";
import type { DocumentActions } from "./document-menu";
import { DocumentRow } from "./document-row";
import { EmptyFolder, FirstDocument, NoMatches, NothingUnfiled } from "./library-empty";

/** The documents of a view, or why there are none and what to do about it. */
export function DocumentList({
  view,
  hasDocuments,
  shown,
  folders,
  query,
  now,
  actions,
  onCreate,
  onSearchEverywhere,
}: {
  view: Exclude<LibraryView, { kind: "trash" }>;
  /** Whether the account has any document at all. */
  hasDocuments: boolean;
  shown: readonly DocumentSummaryDto[];
  folders: readonly FolderDto[];
  query: string;
  now: Date;
  actions: DocumentActions;
  onCreate: (templateId?: TemplateId) => void;
  onSearchEverywhere: () => void;
}) {
  if (!hasDocuments) return <FirstDocument onCreate={onCreate} />;
  if (shown.length > 0) {
    return (
      <ul className="grid gap-px">
        {shown.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            folders={folders}
            showFolder={view.kind === "all"}
            now={now}
            actions={actions}
          />
        ))}
      </ul>
    );
  }
  if (query.trim() !== "") {
    return (
      <NoMatches query={query} {...(view.kind === "all" ? {} : { onSearchEverywhere })} />
    );
  }
  if (view.kind === "folder") return <EmptyFolder onCreate={() => onCreate()} />;
  return <NothingUnfiled />;
}
