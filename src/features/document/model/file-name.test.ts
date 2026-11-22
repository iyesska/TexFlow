import { describe, expect, it } from "vitest";

import { exportFileName } from "./file-name";

describe("exportFileName", () => {
  it("slugs the title and drops accents", () => {
    expect(exportFileName("Introducción a TexFlow", "tex")).toBe(
      "introduccion-a-texflow.tex",
    );
    expect(exportFileName("  ¿Qué es $E=mc^2$?  ", "tex")).toBe("que-es-e-mc-2.tex");
  });

  it("never produces path separators, dots or an empty name", () => {
    expect(exportFileName("../../etc/passwd", "tex")).toBe("etc-passwd.tex");
    expect(exportFileName("¡¡¡!!!", "pdf")).toBe("documento.pdf");
    expect(exportFileName("", "md")).toBe("documento.md");
  });

  it("caps the length without leaving a trailing dash", () => {
    const name = exportFileName(`${"palabra ".repeat(20)}`, "tex");
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).not.toMatch(/-\.tex$/);
  });
});
