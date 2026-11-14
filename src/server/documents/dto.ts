import "server-only";

import type { DocumentDto, DocumentSummaryDto } from "@/contracts/documents";

import type { DocumentRecord, DocumentSummary } from "./documents";

/** How documents travel as JSON: the contract's shapes, with dates as ISO strings. */

export function summaryDto(summary: DocumentSummary): DocumentSummaryDto {
  return {
    id: summary.id,
    title: summary.title,
    titleSource: summary.titleSource,
    folderId: summary.folderId,
    templateId: summary.templateId,
    updatedAt: summary.updatedAt.toISOString(),
  };
}

export function documentDto(document: DocumentRecord): DocumentDto {
  return {
    ...summaryDto(document),
    markdown: document.markdown,
    settings: document.settings,
    revision: document.revision,
    createdAt: document.createdAt.toISOString(),
  };
}
