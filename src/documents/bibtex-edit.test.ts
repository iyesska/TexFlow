import { describe, expect, it } from "vitest";

import { scanBibtex } from "./bibtex";
import {
  appendEntries,
  joinAuthors,
  removeEntry,
  replaceEntry,
  serializeEntry,
  splitAuthors,
  suggestKey,
} from "./bibtex-edit";

describe("serializeEntry", () => {
  it("writes the fields in the usual order, escaping LaTeX but not addresses", () => {
    const text = serializeEntry({
      type: "article",
      key: "perez2020",
      fields: {
        url: "https://example.com/a_b?x=1&y=2",
        title: "Datos & métodos al 50%",
        author: "Pérez, Ana",
        year: "2020",
        note: "",
      },
    });
    expect(text).toBe(
      [
        "@article{perez2020,",
        "  author = {Pérez, Ana},",
        "  title = {Datos \\& métodos al 50\\%},",
        "  year = {2020},",
        "  url = {https://example.com/a_b?x=1&y=2}",
        "}",
      ].join("\n"),
    );
    // What it writes, the scanner reads back.
    expect(scanBibtex(text).entries[0]?.key).toBe("perez2020");
  });

  it("drops braces that do not pair up, which would swallow the rest of the file", () => {
    const text = serializeEntry({
      type: "misc",
      key: "x",
      fields: { title: "Abre { y no cierra" },
    });
    expect(text).toContain("title = {Abre  y no cierra}");
    expect(scanBibtex(`${text}\n@misc{y, title={z}}`).entries).toHaveLength(2);
  });
});

it("keeps the fields the form does not offer, after the others", () => {
  const text = serializeEntry(
    { type: "book", key: "k", fields: { title: "T" } },
    { keywords: "series, {límites}", title: "ignorado" },
  );
  expect(text).toBe("@book{k,\n  title = {T},\n  keywords = {series, {límites}}\n}");
});

describe("authors", () => {
  it("joins one author per line, and splits them back", () => {
    expect(joinAuthors("Pérez, Ana\n\n  Gómez, Juan  \n")).toBe(
      "Pérez, Ana and Gómez, Juan",
    );
    expect(splitAuthors("Pérez, Ana and Gómez, Juan")).toBe("Pérez, Ana\nGómez, Juan");
  });
});

describe("suggestKey", () => {
  it("joins family name, year and the first meaningful word of the title", () => {
    const fields = {
      author: "Pérez, Ana",
      year: "2020",
      title: "La convergencia de series",
    };
    expect(suggestKey(fields, new Set())).toBe("perez2020convergencia");
    expect(suggestKey(fields, new Set(["perez2020convergencia"]))).toBe(
      "perez2020convergenciaa",
    );
    expect(suggestKey({ title: "Sin autor" }, new Set())).toBe("refautor");
  });
});

describe("editing the text", () => {
  const text = "% mis referencias\n@book{a, title={A}}\n\n@book{b, title={B}}\n";

  it("replaces one entry and leaves the rest as it was", () => {
    expect(replaceEntry(text, "b", "@book{b, title={Nuevo}}")).toBe(
      "% mis referencias\n@book{a, title={A}}\n\n@book{b, title={Nuevo}}\n",
    );
    expect(replaceEntry(text, "zzz", "@book{zzz}")).toBe(text);
  });

  it("removes an entry without leaving a gap", () => {
    expect(removeEntry(text, "a")).toBe("% mis referencias\n\n@book{b, title={B}}\n");
    expect(removeEntry(text, "b")).toBe("% mis referencias\n@book{a, title={A}}\n");
  });

  it("appends after a blank line", () => {
    expect(appendEntries("", "@book{c}")).toBe("@book{c}\n");
    expect(appendEntries(text, "@book{c}\n")).toBe(`${text.trimEnd()}\n\n@book{c}\n`);
  });
});
