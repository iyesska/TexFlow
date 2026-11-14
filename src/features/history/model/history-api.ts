import {
  namedVersionResponseSchema,
  restoreResponseSchema,
  versionListResponseSchema,
  versionResponseSchema,
  type DocumentDto,
  type VersionContent,
  type VersionDto,
  type VersionSummaryDto,
} from "@/contracts/documents";
import { callApi, unwrap, type ApiResult } from "@/lib/api-client";

/** The history's calls to /api/documents/:id/versions. */

const versionsUrl = (documentId: string) =>
  `/api/documents/${encodeURIComponent(documentId)}/versions`;

const versionUrl = (documentId: string, versionId: string) =>
  `${versionsUrl(documentId)}/${encodeURIComponent(versionId)}`;

/** The document's versions, newest first. */
export async function fetchVersions(
  documentId: string,
  signal?: AbortSignal,
): Promise<ApiResult<readonly VersionSummaryDto[]>> {
  const result = await callApi(
    versionsUrl(documentId),
    { method: "GET", signal },
    versionListResponseSchema,
  );
  return unwrap(result, ({ versions }) => versions);
}

/** One version with its content. */
export async function fetchVersion(
  documentId: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<ApiResult<VersionDto>> {
  const result = await callApi(
    versionUrl(documentId, versionId),
    { method: "GET", signal },
    versionResponseSchema,
  );
  return unwrap(result, ({ version }) => version);
}

/** Keeps the document as the server has it now with a name, or `content` in its place. */
export async function keepNamedVersion(
  documentId: string,
  label: string,
  content?: VersionContent,
): Promise<ApiResult<VersionSummaryDto>> {
  const result = await callApi(
    versionsUrl(documentId),
    { method: "POST", json: { label, content } },
    namedVersionResponseSchema,
  );
  return unwrap(result, ({ version }) => version);
}

export interface Restored {
  readonly document: DocumentDto;
  /** The state the restore replaced, kept as a version: restoring it undoes this. */
  readonly kept: VersionSummaryDto;
}

/** Puts a version back, on top of the revision the writer was looking at. */
export async function restoreVersion(
  documentId: string,
  versionId: string,
  baseRevision: number,
): Promise<ApiResult<Restored>> {
  const result = await callApi(
    `${versionUrl(documentId, versionId)}/restore`,
    { method: "POST", json: { baseRevision } },
    restoreResponseSchema,
  );
  return unwrap(result, (restored) => restored);
}
