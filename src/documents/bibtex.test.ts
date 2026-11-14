import { describe, expect, it } from "vitest";

import {
  authorsLabel,
  bibliographyFor,
  citedKeys,
  entryYear,
  familyNames,
  plainText,
  scanBibtex,
} from "./bibtex";

const BIB = String.raw`% Exported from a reference manager
@string{jams = "Journal of the American Mathematical Society"}

@article{euler1734,
  author = {Euler, Leonhard and P{\'e}rez, Ana},
  title = {De summis serierum {reciprocarum}},
  journal = jams # " (reimpresión)",
  year = 1734,
  pages = {123--134}
}

@Book{knuth1984,
  author    = "Knuth, Donald E.",
  title     = "The {\TeX}book",
  publisher = {Addison-Wesley},
  date      = {1984-01-01},
}

@comment{ignored {nested} braces}
`;

describe("scanBibtex", () => {
  it("finds entries with their type, key, fields and line", () => {
    const { entries, problems } = scanBibtex(BIB);
    expect(problems).toEqual([]);
    expect(entries.map(({ type, key, line }) => ({ type, key, line }))).toEqual([
      { type: "article", key: "euler1734", line: 4 },
      { type: "book", key: "knuth1984", line: 12 },
    ]);
    expect(entries[0]?.fields).toMatchObject({
      author: String.raw`Euler, Leonhard and P{\'e}rez, Ana`,
      title: "De summis serierum {reciprocarum}",
      journal: "jams (reimpresión)",
      year: "1734",
    });
    expect(entries[1]?.fields.title).toBe(String.raw`The {\TeX}book`);
  });

  it("keeps @string definitions apart, and skips comments", () => {
    const { definitions } = scanBibtex(BIB);
    expect(definitions).toHaveLength(1);
    expect(BIB.slice(definitions[0]!.start, definitions[0]!.end)).toMatch(
      /^@string\{jams/,
    );
  });

  it("reports what it cannot read, with its line, and reads on", () => {
    const text =
      "@article{sinCierre,\n  title = {Abierto\n\n@book{bueno, title = {Sí}}\n@misc{, title={x}}\n@book{bueno, title={Otra}}";
    const { entries, problems } = scanBibtex(text);
    expect(entries.map(({ key }) => key)).toEqual(["bueno", "bueno"]);
    expect(problems).toEqual([
      { line: 1, message: "La entrada @article no se cierra: falta una «}»." },
      { line: 5, message: "La entrada @misc no tiene una clave válida." },
      { line: 6, message: "La clave «bueno» está repetida." },
    ]);
  });
});

describe("citedKeys", () => {
  it("reads Pandoc's citation forms, and not e-mail addresses", () => {
    const markdown =
      "Como [@euler1734, p. 5; véase @knuth1984] y -@gauss:1801 dicen, @{clave rara}." +
      " Escribe a ana@example.com.";
    expect([...citedKeys(markdown)]).toEqual([
      "euler1734",
      "knuth1984",
      "gauss:1801",
      "clave rara",
    ]);
  });
});

describe("bibliographyFor", () => {
  it("keeps only the cited entries, with the definitions they may use", () => {
    const subset = bibliographyFor("Según [@euler1734].", BIB);
    expect(subset).toContain("@string{jams");
    expect(subset).toContain("@article{euler1734");
    expect(subset).not.toContain("knuth1984");
  });

  it("is empty when nothing the bibliography has is cited", () => {
    expect(bibliographyFor("Sin citas.", BIB)).toBe("");
    expect(bibliographyFor("[@otro]", BIB)).toBe("");
    expect(bibliographyFor("[@euler1734]", "  ")).toBe("");
  });
});

describe("display helpers", () => {
  it("turns LaTeX into plain text", () => {
    expect(plainText(String.raw`P{\'e}rez y Mu{\~n}oz {\&} G\"odel`)).toBe(
      "Pérez y Muñoz & Gödel",
    );
    expect(plainText(String.raw`The {\TeX}book, pp.~12--15`)).toBe(
      "The TeXbook, pp. 12–15",
    );
    expect(
      plainText(String.raw`\LaTeX\ y Stra\ss e: 50\% --- {\v{S}}koda, \emph{nuevo}`),
    ).toBe("LaTeX y Straße: 50% — Škoda, nuevo");
  });

  it("names the authors as a list of references does", () => {
    expect(
      familyNames("Euler, Leonhard and Ana P{\\'e}rez and {World Health Organization}"),
    ).toEqual(["Euler", "Pérez", "World Health Organization"]);
    const [euler, knuth] = scanBibtex(BIB).entries;
    expect(authorsLabel(euler!)).toBe("Euler y Pérez");
    expect(authorsLabel(knuth!)).toBe("Knuth");
    expect(entryYear(euler!)).toBe("1734");
    expect(entryYear(knuth!)).toBe("1984");
  });
});
