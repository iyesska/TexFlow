import { describe, expect, it } from "vitest";

import { ASSET_LIMITS, assetName, detectAssetType, suggestedAltText } from "./asset";
import { createAssetLibrary, type AssetStore } from "./asset-library";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 1, 2, 3];

const file = (bytes: number[], name: string, type = "image/png") =>
  new File([new Uint8Array(bytes)], name, { type });

/** A server in memory that names images like the real one. */
function memoryStore(): AssetStore & { readonly uploads: File[] } {
  const uploads: File[] = [];
  const taken = new Set<string>();
  return {
    uploads,
    url: (name) => `/api/documents/doc/assets/${name}`,
    async upload(upload) {
      uploads.push(upload);
      const head = new Uint8Array(await upload.slice(0, 8).arrayBuffer());
      const type = detectAssetType(head);
      if (!type) return { ok: false, reason: "unsupported-type" };
      const name = assetName(upload.name, type, taken);
      taken.add(name);
      return { ok: true, name, asset: { name, type, size: upload.size } };
    },
    download: async () => new Blob(["bytes"]),
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
  const library = (store = memoryStore()) =>
    createAssetLibrary({
      store,
      initial: [{ name: "previa.png", type: "image/png", size: 10 }],
    });

  it("lists the document's images with the URL each is served from", () => {
    expect(library().getSnapshot().get("previa.png")).toEqual({
      name: "previa.png",
      type: "image/png",
      size: 10,
      url: "/api/documents/doc/assets/previa.png",
    });
  });

  it("stores a new image under the name the server chooses", async () => {
    const instance = library();
    expect(await instance.add(file(PNG, "Figura 1.png"))).toEqual({
      ok: true,
      name: "figura-1.png",
    });
    expect(instance.getSnapshot().get("figura-1.png")?.url).toBe(
      "/api/documents/doc/assets/figura-1.png",
    );
  });

  it("refuses files that are not images, too large, or one too many, before uploading", async () => {
    const store = memoryStore();
    const instance = library(store);
    const html = new File(["<script>alert(1)</script>"], "x.png", { type: "image/png" });
    expect(await instance.add(html)).toEqual({ ok: false, reason: "unsupported-type" });

    const huge = new File([new Uint8Array(ASSET_LIMITS.maxBytes + 1)], "big.png");
    expect(await instance.add(huge)).toEqual({ ok: false, reason: "too-large" });
    expect(store.uploads).toHaveLength(0);

    for (let index = 1; index < ASSET_LIMITS.maxPerDocument; index++) {
      await instance.add(file(PNG, `n${index}.png`));
    }
    expect(await instance.add(file(PNG, "extra.png"))).toEqual({
      ok: false,
      reason: "too-many",
    });
  });

  it("passes on the server's refusal without listing the image", async () => {
    const instance = createAssetLibrary({
      initial: [],
      store: {
        ...memoryStore(),
        upload: async () => ({
          ok: false,
          reason: "upload-failed",
          message: "Demasiadas peticiones seguidas.",
        }),
      },
    });
    expect(await instance.add(file(PNG, "a.png"))).toEqual({
      ok: false,
      reason: "upload-failed",
      message: "Demasiadas peticiones seguidas.",
    });
    expect(instance.getSnapshot().size).toBe(0);
  });

  it("notifies subscribers, and reads only images it has", async () => {
    const instance = library();
    let notified = 0;
    instance.subscribe(() => notified++);
    await instance.add(file(PNG, "a.png"));
    expect(notified).toBe(1);
    expect(await instance.read("a.png")).toBeInstanceOf(Blob);
    expect(await instance.read("ajena.png")).toBeNull();
  });
});
