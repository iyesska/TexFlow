import "server-only";

import type {
  DocumentDto,
  DocumentSummaryDto,
  VersionDto,
  VersionSummaryDto,
} from "@/contracts/documents";

import type { DocumentRecord, DocumentSummary } from "./documents";
import type { VersionRecord, VersionSummary } from "./versions";

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
    bibliography: document.bibliography,
    revision: document.revision,
    createdAt: document.createdAt.toISOString(),
  };
}

export function versionSummaryDto(version: VersionSummary): VersionSummaryDto {
  return {
    id: version.id,
    kind: version.kind,
    label: version.label,
    title: version.title,
    revision: version.revision,
    createdAt: version.createdAt.toISOString(),
  };
}

export function versionDto(version: VersionRecord): VersionDto {
  return {
    ...versionSummaryDto(version),
    markdown: version.markdown,
    settings: version.settings,
    bibliography: version.bibliography,
  };
}
