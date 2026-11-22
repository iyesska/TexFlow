import { describe, expect, it } from "vitest";

import { normalize, searchCommands } from "./search";

const commands = [
  { label: "Guardar ahora", keywords: ["salvar"] },
  { label: "Historial de versiones", keywords: ["restaurar", "deshacer"] },
  { label: "Guardar una versión con nombre" },
  { label: "Descargar PDF", keywords: ["exportar"] },
  { label: "Plantilla: Tesis", keywords: ["diseño"] },
];

const labels = (query: string) =>
  searchCommands(commands, query).map(({ label }) => label);

describe("normalize", () => {
  it("drops case and accents", () => {
    expect(normalize("Versión ÁRBOL")).toBe("version arbol");
  });
});

describe("searchCommands", () => {
  it("returns every command, in order, for an empty query", () => {
    expect(labels("  ")).toHaveLength(commands.length);
  });

  it("matches the start of words, without accents or case", () => {
    expect(labels("version")).toEqual([
      "Historial de versiones",
      "Guardar una versión con nombre",
    ]);
    expect(labels("GUARD VERS")).toEqual(["Guardar una versión con nombre"]);
  });

  it("puts names that start with the query first", () => {
    expect(labels("guardar")).toEqual([
      "Guardar ahora",
      "Guardar una versión con nombre",
    ]);
    expect(labels("des")[0]).toBe("Descargar PDF");
  });

  it("finds commands by their other names, after those that match by name", () => {
    expect(labels("restaurar")).toEqual(["Historial de versiones"]);
    expect(labels("exportar pdf")).toEqual(["Descargar PDF"]);
    expect(labels("diseño")).toEqual(["Plantilla: Tesis"]);
  });

  it("finds nothing for words no command has, nor for the middle of a word", () => {
    expect(labels("volar")).toEqual([]);
    // "carg" is inside "Descargar", but no word starts with it.
    expect(labels("carg")).toEqual([]);
  });
});
