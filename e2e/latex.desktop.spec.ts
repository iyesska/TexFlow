import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const latex = (page: Page) =>
  page.getByRole("textbox", { name: "Código LaTeX generado" });
const latexPane = (page: Page) =>
  page.getByRole("region", { name: "LaTeX", exact: true });

/** Replaces the whole document with `text`. */
async function write(page: Page, text: string) {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(text);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
});

test("generates a complete LaTeX document by default", async ({ page }) => {
  await expect(latex(page)).toContainText("\\documentclass");
  await expect(latexPane(page)).toContainText("Actualizado");
});

test("converts the document as it is written", async ({ page }) => {
  await page.getByRole("radio", { name: "Solo el cuerpo" }).click();
  await write(page, "# Hola\n\nTexto **fuerte** y $x^2$.");
  await expect(latex(page)).toContainText("\\section{Hola}");
  await expect(latex(page)).toContainText("\\textbf{fuerte}");
  await expect(latex(page)).toContainText("\\(x^2\\)");
  await expect(latex(page)).not.toContainText("\\documentclass");

  await page.keyboard.type("\n\n## Más");
  await expect(latex(page)).toContainText("\\subsection{Más}");
});

test("copies the LaTeX to the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await write(page, "# Copia");

  // The button stays disabled until the code matches what was just typed.
  await page.getByRole("button", { name: "Copiar código" }).click();
  await expect(page.getByText("Código LaTeX copiado")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("\\section{Copia}");
  expect(copied).toContain("\\end{document}");
});

test("downloads a .tex file named after the document", async ({ page }) => {
  await write(page, "# Mi informe");
  await expect(page.getByRole("banner")).toContainText("Mi informe");
  // Wait for the conversion of the new text, not the sample's.
  await page.getByRole("radio", { name: "Solo el cuerpo" }).click();
  await expect(latex(page)).toContainText("\\section{Mi informe}");

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar .tex" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("mi-informe.tex");
  expect(await readFile(await download.path(), "utf8")).toContain(
    "\\section{Mi informe}",
  );
});

test("explains a syntax error and keeps the last good output", async ({ page }) => {
  await page.getByRole("radio", { name: "Solo el cuerpo" }).click();
  await write(page, "# Bien");
  await expect(latex(page)).toContainText("\\section{Bien}");

  await write(page, "---\ntitle: [a\n---\n\nTexto");
  const alert = latexPane(page).getByRole("alert");
  await expect(alert).toContainText("metadatos YAML");
  await expect(alert).toContainText("Línea 2 del bloque de metadatos");
  await expect(latex(page)).toContainText("\\section{Bien}");
  await expect(latexPane(page)).toContainText("Sin actualizar");

  await write(page, "# Arreglado");
  await expect(alert).toBeHidden();
  await expect(latex(page)).toContainText("\\section{Arreglado}");
});

test("recovers when the server cannot be reached", async ({ page }) => {
  await page.getByRole("radio", { name: "Solo el cuerpo" }).click();
  await expect(latex(page)).toContainText("\\section");
  await page.route("**/api/convert", (route) => route.abort());
  await write(page, "# Sin red");
  const alert = latexPane(page).getByRole("alert");
  await expect(alert).toContainText("No se pudo contactar con el servidor");

  await page.unroute("**/api/convert");
  await alert.getByRole("button", { name: "Reintentar" }).click();
  await expect(alert).toBeHidden();
  await expect(latex(page)).toContainText("\\section{Sin red}");
});
