import { describe, expect, it } from "vitest";

import { imagesUsedBy } from "./used-images";

describe("imagesUsedBy", () => {
  it("keeps only the images the document mentions", () => {
    const images = [{ name: "a.png" }, { name: "b.jpg" }, { name: "c.png" }];
    expect(imagesUsedBy("![x](a.png) y ![y](c.png)", images)).toEqual([
      { name: "a.png" },
      { name: "c.png" },
    ]);
    expect(imagesUsedBy("sin imágenes", images)).toEqual([]);
  });
});
