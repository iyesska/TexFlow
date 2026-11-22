// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ASSET_UPLOAD_FIELD } from "@/contracts/documents";
import { createDocument } from "@/server/documents/documents";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { apiRequest, routeContext, uploadRequest } from "@/server/testing/requests";
import { signInAs } from "@/server/testing/session-mock";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { DELETE, GET as getImage } from "./[name]/route";
import { GET, POST } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

const png = readFileSync(path.join(process.cwd(), "e2e/fixtures/Diagrama de prueba.png"));

let id: string;

function upload(name: string, data: BlobPart) {
  return POST(
    uploadRequest(
      `/api/documents/${id}/assets`,
      ASSET_UPLOAD_FIELD,
      new File([data], name),
    ),
    routeContext({ id }),
  );
}

function image(name: string, headers: Record<string, string> = {}) {
  return getImage(
    apiRequest("GET", `/api/documents/${id}/assets/${name}`, { headers }),
    routeContext({ id, name }),
  );
}

describe.skipIf(!databaseAvailable)("/api/documents/[id]/assets", () => {
  beforeEach(async () => {
    const user = await createTestUser();
    signInAs(user);
    const created = await createDocument(user.id, {
      markdown: "",
      settings: DEFAULT_SETTINGS,
    });
    if (!created.ok) throw new Error(created.reason);
    id = created.document.id;
  });

  it("stores an image under the name the server chooses, and lists it", async () => {
    const response = await upload("Diagrama de prueba.png", png);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ok: true,
      asset: { name: "diagrama-de-prueba.png", type: "image/png", size: png.length },
    });
    const list = await GET(
      apiRequest("GET", `/api/documents/${id}/assets`),
      routeContext({ id }),
    );
    expect(await list.json()).toMatchObject({
      assets: [{ name: "diagrama-de-prueba.png" }],
    });
  });

  it("serves an image only as an image, and revalidates it with its ETag", async () => {
    await upload("figura.png", png);
    const response = await image("figura.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);

    const etag = response.headers.get("etag") ?? "";
    const again = await image("figura.png", { "if-none-match": etag });
    expect(again.status).toBe(304);
    expect(await again.text()).toBe("");
  });

  it("refuses a file that is not an image, whatever its name says", async () => {
    const response = await upload("foto.png", "<svg onload=alert(1)>");
    expect(response.status).toBe(415);
  });

  it("deletes an image", async () => {
    await upload("figura.png", png);
    const response = await DELETE(
      apiRequest("DELETE", `/api/documents/${id}/assets/figura.png`),
      routeContext({ id, name: "figura.png" }),
    );
    expect(response.status).toBe(204);
    expect((await image("figura.png")).status).toBe(404);
  });

  it("keeps a document's images from other users", async () => {
    await upload("figura.png", png);
    signInAs(await createTestUser());
    expect((await image("figura.png")).status).toBe(404);
    expect((await upload("otra.png", png)).status).toBe(404);
  });
});
