import { z } from "zod";

import {
  ASSET_UPLOAD_FIELD,
  documentSummarySchema,
  folderSchema,
  type CreateDocumentRequest,
  type DocumentSummaryDto,
  type FolderDto,
} from "@/contracts/documents";
import { callApi, unwrap } from "@/lib/api-client";

/** The library's calls to /api/documents and /api/folders. */

const documentResult = z.object({ document: documentSummarySchema });
const folderResult = z.object({ folder: folderSchema });

type Result<Value> =
  | { readonly ok: true; readonly value: Value }
  | {
      readonly ok: false;
      readonly message: string;
    };

const documentUrl = (id: string) => `/api/documents/${encodeURIComponent(id)}`;
const folderUrl = (id: string) => `/api/folders/${encodeURIComponent(id)}`;

export async function createDocument(
  request: CreateDocumentRequest = {},
): Promise<Result<DocumentSummaryDto>> {
  const result = await callApi(
    "/api/documents",
    { method: "POST", json: request },
    documentResult,
  );
  return unwrap(result, ({ document }) => document);
}

export async function renameDocument(
  id: string,
  title: string | null,
): Promise<Result<DocumentSummaryDto>> {
  const result = await callApi(
    documentUrl(id),
    { method: "PATCH", json: { action: "rename", title } },
    documentResult,
  );
  return unwrap(result, ({ document }) => document);
}

export async function moveDocument(
  id: string,
  folderId: string | null,
): Promise<Result<DocumentSummaryDto>> {
  const result = await callApi(
    documentUrl(id),
    { method: "PATCH", json: { action: "move", folderId } },
    documentResult,
  );
  return unwrap(result, ({ document }) => document);
}

export async function duplicateDocument(id: string): Promise<Result<DocumentSummaryDto>> {
  const result = await callApi(
    `${documentUrl(id)}/duplicate`,
    { method: "POST" },
    documentResult,
  );
  return unwrap(result, ({ document }) => document);
}

export async function deleteDocument(id: string): Promise<Result<null>> {
  const result = await callApi(documentUrl(id), { method: "DELETE" }, null);
  return result.ok ? { ok: true, value: null } : { ok: false, message: result.message };
}

export async function createFolder(name: string): Promise<Result<FolderDto>> {
  const result = await callApi(
    "/api/folders",
    { method: "POST", json: { name } },
    folderResult,
  );
  return unwrap(result, ({ folder }) => folder);
}

export async function renameFolder(id: string, name: string): Promise<Result<FolderDto>> {
  const result = await callApi(
    folderUrl(id),
    { method: "PATCH", json: { name } },
    folderResult,
  );
  return unwrap(result, ({ folder }) => folder);
}

export async function deleteFolder(id: string): Promise<Result<null>> {
  const result = await callApi(folderUrl(id), { method: "DELETE" }, null);
  return result.ok ? { ok: true, value: null } : { ok: false, message: result.message };
}

/** Uploads one image to a document; the answer says what the server named it. */
export async function uploadImage(
  documentId: string,
  file: Blob,
  name: string,
): Promise<Result<string>> {
  const body = new FormData();
  body.set(ASSET_UPLOAD_FIELD, file, name);
  const result = await callApi(
    `${documentUrl(documentId)}/assets`,
    { method: "POST", body },
    z.object({ asset: z.object({ name: z.string() }) }),
  );
  return unwrap(result, ({ asset }) => asset.name);
}

/** Replaces a document's content, on top of the revision it was read at. */
export async function saveDocumentContent(
  id: string,
  change: {
    readonly markdown: string;
    readonly settings: unknown;
    readonly baseRevision: number;
  },
): Promise<Result<null>> {
  const result = await callApi(
    documentUrl(id),
    { method: "PATCH", json: { action: "save", ...change } },
    null,
  );
  return result.ok ? { ok: true, value: null } : { ok: false, message: result.message };
}
