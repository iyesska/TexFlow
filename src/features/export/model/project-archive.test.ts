import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildProjectArchive } from "./project-archive";

describe("buildProjectArchive", () => {
  const base = {
    baseName: "mi-tesis",
    markdown: "# Mi tesis\n\n![a](a.png)",
    latex: "\\section{Mi tesis}",
    images: [{ name: "a.png", data: new Uint8Array([1, 2, 3]) }],
  };

  it("puts the sources and the images side by side in one folder", () => {
    const files = unzipSync(buildProjectArchive(base));
    expect(Object.keys(files).sort()).toEqual([
      "mi-tesis/a.png",
      "mi-tesis/mi-tesis.md",
      "mi-tesis/mi-tesis.tex",
    ]);
    expect(strFromU8(files["mi-tesis/mi-tesis.md"] ?? new Uint8Array())).toBe(
      base.markdown,
    );
    expect(strFromU8(files["mi-tesis/mi-tesis.tex"] ?? new Uint8Array())).toBe(
      base.latex,
    );
    expect(files["mi-tesis/a.png"]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("includes the references as a .bib file when there are any", () => {
    const bibliography = "@book{a, title={A}}";
    const files = unzipSync(buildProjectArchive({ ...base, bibliography }));
    expect(strFromU8(files["mi-tesis/mi-tesis.bib"] ?? new Uint8Array())).toBe(
      bibliography,
    );
    expect(
      Object.keys(unzipSync(buildProjectArchive({ ...base, bibliography: " " }))),
    ).not.toContain("mi-tesis/mi-tesis.bib");
  });

  it("includes the PDF when there is one", () => {
    const pdf = new Uint8Array([37, 80, 68, 70]);
    const files = unzipSync(buildProjectArchive({ ...base, pdf }));
    expect(files["mi-tesis/mi-tesis.pdf"]).toEqual(pdf);
  });
});
