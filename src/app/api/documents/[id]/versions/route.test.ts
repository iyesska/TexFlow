// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { restoreResponseSchema, versionSchema } from "@/contracts/documents";
import type { SessionUser } from "@/server/auth/session";
import { createDocument, saveDocumentContent } from "@/server/documents/documents";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { apiRequest, routeContext } from "@/server/testing/requests";
import { signInAs } from "@/server/testing/session-mock";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { POST as restore } from "./[versionId]/restore/route";
import { GET as getVersion } from "./[versionId]/route";
import { GET, POST } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

let user: SessionUser;
let id: string;

const list = async () =>
  (
    await (
      await GET(apiRequest("GET", `/api/documents/${id}/versions`), routeContext({ id }))
    ).json()
  ).versions as { id: string; kind: string; label: string | null }[];

describe.skipIf(!databaseAvailable)("/api/documents/[id]/versions", () => {
  beforeEach(async () => {
    user = await createTestUser();
    signInAs(user);
    const created = await createDocument(user.id, {
      markdown: "# Primera",
      settings: DEFAULT_SETTINGS,
    });
    if (!created.ok) throw new Error(created.reason);
    id = created.document.id;
  });

  it("keeps a named version, lists it and returns its content", async () => {
    expect(await list()).toEqual([]);
    const response = await POST(
      apiRequest("POST", `/api/documents/${id}/versions`, { json: { label: "Entrega" } }),
      routeContext({ id }),
    );
    expect(response.status).toBe(201);
    const [version] = await list();
    expect(version).toMatchObject({ kind: "named", label: "Entrega" });

    const one = await getVersion(
      apiRequest("GET", `/api/documents/${id}/versions/${version!.id}`),
      routeContext({ id, versionId: version!.id }),
    );
    expect(versionSchema.parse((await one.json()).version).markdown).toBe("# Primera");
  });

  it("refuses an empty name", async () => {
    const response = await POST(
      apiRequest("POST", `/api/documents/${id}/versions`, { json: { label: "  " } }),
      routeContext({ id }),
    );
    expect(response.status).toBe(400);
  });

  it("restores a version on the revision the writer saw, and refuses a stale one", async () => {
    await saveDocumentContent(user.id, id, {
      markdown: "# Segunda",
      settings: DEFAULT_SETTINGS,
      baseRevision: 0,
    });
    const [first] = await list();
    const call = (baseRevision: number) =>
      restore(
        apiRequest("POST", `/api/documents/${id}/versions/${first!.id}/restore`, {
          json: { baseRevision },
        }),
        routeContext({ id, versionId: first!.id }),
      );

    const stale = await call(0);
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({
      error: { code: "conflict", revision: 1 },
    });

    const done = await call(1);
    expect(done.status).toBe(200);
    const body = restoreResponseSchema.parse(await done.json());
    expect(body.document).toMatchObject({ markdown: "# Primera", revision: 2 });
    expect(body.kept).toMatchObject({ kind: "before-restore", title: "Segunda" });
  });

  it("keeps the history from other users", async () => {
    signInAs(await createTestUser());
    const response = await GET(
      apiRequest("GET", `/api/documents/${id}/versions`),
      routeContext({ id }),
    );
    expect(response.status).toBe(404);
  });
});
