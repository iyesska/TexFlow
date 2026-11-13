import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { ASSET_LIMITS, assetName, detectAssetType, suggestedAltText } from "./asset";
import { createAssetLibrary } from "./asset-library";
import { createIndexedDbAssetStore, type AssetStore } from "./asset-store";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 1, 2, 3];

const file = (bytes: number[], name: string, type = "image/png") =>
  new File([new Uint8Array(bytes)], name, { type });

function library(store: AssetStore = memoryStore()) {
  let count = 0;
  const revoked: string[] = [];
  const instance = createAssetLibrary({
    documentId: "doc",
    store,
    urls: { create: () => `blob:test/${++count}`, revoke: (url) => revoked.push(url) },
    now: () => new Date("2026-01-01T00:00:00Z"),
  });
  return { instance, revoked };
}

function memoryStore(): AssetStore {
  const assets: Parameters<AssetStore["put"]>[0][] = [];
  return {
    list: async (documentId) => assets.filter((asset) => asset.documentId === documentId),
    put: async (asset) => void assets.push(asset),
  };
}

describe("detectAssetType", () => {
  it("recognises PNG and JPEG by their first bytes", () => {
    expect(detectAssetType(new Uint8Array(PNG))).toBe("image/png");
    expect(detectAssetType(new Uint8Array(JPEG))).toBe("image/jpeg");
  });

  it("rejects everything else, including SVG and empty files", () => {
    expect(detectAssetType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectAssetType(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull();
    expect(detectAssetType(new Uint8Array())).toBeNull();
  });
});

describe("assetName", () => {
  it("slugs the name and takes the extension from the real type", () => {
    expect(assetName("Mi Diagrama (final).PNG", "image/png", new Set())).toBe(
      "mi-diagrama-final.png",
    );
    expect(assetName("foto.png", "image/jpeg", new Set())).toBe("foto.jpg");
  });

  it("never produces a path or an empty name", () => {
    expect(assetName("../../etc/passwd", "image/png", new Set())).toBe("passwd.png");
    expect(assetName("C:\\fotos\\a.b.png", "image/png", new Set())).toBe("a-b.png");
    expect(assetName("¡¡!!.png", "image/png", new Set())).toBe("imagen.png");
  });

  it("numbers a name that is already taken", () => {
    const taken = new Set(["a.png", "a-2.png"]);
    expect(assetName("a.png", "image/png", taken)).toBe("a-3.png");
  });
});

describe("suggestedAltText", () => {
  it("turns a file name into words and drops brackets", () => {
    expect(suggestedAltText("diagrama_del-experimento.png")).toBe(
      "diagrama del experimento",
    );
    expect(suggestedAltText("[x].png")).toBe("x");
    expect(suggestedAltText(".png")).toBe("Imagen");
  });
});

describe("asset library", () => {
  it("stores an image under a safe name and exposes a URL for it", async () => {
    const { instance } = library();
    const result = await instance.add(file(PNG, "Figura 1.png"));
    expect(result).toEqual({ ok: true, name: "figura-1.png" });
    expect(instance.getSnapshot().get("figura-1.png")).toMatchObject({
      type: "image/png",
      url: "blob:test/1",
    });
  });

  it("types the stored image by its content, not by what the file claims", async () => {
    const { instance } = library();
    const result = await instance.add(file(JPEG, "foto.png", "image/png"));
    expect(result).toEqual({ ok: true, name: "foto.jpg" });
    expect(instance.getSnapshot().get("foto.jpg")?.blob.type).toBe("image/jpeg");
  });

  it("rejects files that are not images, too large, or one too many", async () => {
    const { instance } = library();
    const html = new File(["<script>alert(1)</script>"], "x.png", { type: "image/png" });
    expect(await instance.add(html)).toEqual({ ok: false, reason: "unsupported-type" });

    const huge = new File([new Uint8Array(ASSET_LIMITS.maxBytes + 1)], "big.png");
    expect(await instance.add(huge)).toEqual({ ok: false, reason: "too-large" });

    for (let index = 0; index < ASSET_LIMITS.maxPerDocument; index++) {
      await instance.add(file(PNG, `n${index}.png`));
    }
    expect(await instance.add(file(PNG, "extra.png"))).toEqual({
      ok: false,
      reason: "too-many",
    });
  });

  it("reports a storage failure without listing the image", async () => {
    const failing: AssetStore = {
      list: async () => [],
      put: async () => {
        throw new Error("quota");
      },
    };
    const { instance } = library(failing);
    expect(await instance.add(file(PNG, "a.png"))).toEqual({
      ok: false,
      reason: "storage-failed",
    });
    expect(instance.getSnapshot().size).toBe(0);
  });

  it("notifies subscribers and releases its URLs on dispose", async () => {
    const { instance, revoked } = library();
    let notified = 0;
    instance.subscribe(() => notified++);
    await instance.add(file(PNG, "a.png"));
    expect(notified).toBe(1);

    instance.dispose();
    expect(revoked).toEqual(["blob:test/1"]);
  });

  it("persists images in IndexedDB, per document", async () => {
    const store = createIndexedDbAssetStore(() => indexedDB);
    const first = library(store).instance;
    await first.add(file(PNG, "persistente.png"));

    const reopened = library(store).instance;
    await reopened.load();
    expect([...reopened.getSnapshot().keys()]).toEqual(["persistente.png"]);
    expect(await store.list("otro-documento")).toEqual([]);
  });
});
