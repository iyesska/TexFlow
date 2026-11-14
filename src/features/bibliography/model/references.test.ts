import { describe, expect, it } from "vitest";

import { filterReferences, listReferences, typeLabel } from "./references";

const BIB = String.raw`@article{perez2020,
  author = {P{\'e}rez, Ana and G{\'o}mez, Juan},
  title = {Series {convergentes}},
  journal = {Revista de Matemáticas},
  year = {2020}
}
@book{knuth1984, author = {Knuth, Donald}, title = {The TeXbook}, publisher = {Addison-Wesley}, year = 1984}
@misc{sinTitulo, year = 2001}`;

describe("listReferences", () => {
  it("lists each reference with what the panel shows, and which the text cites", () => {
    const { references, problems, missing } = listReferences(
      BIB,
      "Según [@perez2020] y [@otra].",
    );
    expect(problems).toEqual([]);
    expect(
      references.map(({ key, title, authors, year, source, cited }) => ({
        key,
        title,
        authors,
        year,
        source,
        cited,
      })),
    ).toEqual([
      {
        key: "perez2020",
        title: "Series convergentes",
        authors: "Pérez y Gómez",
        year: "2020",
        source: "Revista de Matemáticas",
        cited: true,
      },
      {
        key: "knuth1984",
        title: "The TeXbook",
        authors: "Knuth",
        year: "1984",
        source: "Addison-Wesley",
        cited: false,
      },
      {
        key: "sinTitulo",
        title: "Sin título",
        authors: "",
        year: "2001",
        source: "",
        cited: false,
      },
    ]);
    expect(missing).toEqual(["otra"]);
  });
});

describe("filterReferences", () => {
  it("finds references by key, title, author or year, ignoring accents", () => {
    const { references } = listReferences(BIB, "");
    const keys = (query: string) =>
      filterReferences(references, query).map(({ key }) => key);
    expect(keys("perez")).toEqual(["perez2020"]);
    expect(keys("TEXBOOK")).toEqual(["knuth1984"]);
    expect(keys("2001")).toEqual(["sinTitulo"]);
    expect(keys("  ")).toEqual(["perez2020", "knuth1984", "sinTitulo"]);
  });
});

describe("typeLabel", () => {
  it("names the types in Spanish, and shows any other as it is written", () => {
    expect(typeLabel("article")).toBe("Artículo de revista");
    expect(typeLabel("patent")).toBe("@patent");
  });
});
