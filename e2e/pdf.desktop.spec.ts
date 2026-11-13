import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";

// Compiling runs the real LaTeX engine: see scripts/setup-tectonic.sh.
test.describe.configure({ timeout: 90_000 });

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const previewPane = (page: Page) =>
  page.getByRole("region", { name: "Vista previa", exact: true });
const pdfPage = (page: Page, number: number) =>
  previewPane(page).getByRole("img", { name: `Página ${number}`, exact: true });
const pageLabel = (page: Page) => previewPane(page).getByLabel("Página", { exact: true });
const compiled = { timeout: 60_000 };

/** Replaces the whole document with `text`. */
async function write(page: Page, text: string) {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(text);
}

async function exportAs(page: Page, item: string) {
  const downloading = page.waitForEvent("download", compiled);
  await page.getByRole("button", { name: "Exportar" }).click();
  await page.getByRole("menuitem", { name: item }).click();
  return downloading;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
});

test("compiles the document and shows the PDF", async ({ page }) => {
  await page.getByRole("radio", { name: "PDF" }).click();
  await expect(pdfPage(page, 1)).toBeVisible(compiled);
  await expect(pageLabel(page)).toHaveText(/^1 de \d+$/);
  await expect(previewPane(page)).toContainText("PDF al día");

  // The canvas is really drawn on: it does not stay blank.
  await expect
    .poll(() =>
      pdfPage(page, 1).evaluate((canvas: HTMLCanvasElement) => {
        const { data } = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height);
        return data.some((value, index) => index % 4 !== 3 && value < 128);
      }),
    )
    .toBe(true);
});

test("moves between the pages of a longer document", async ({ page }) => {
  await write(page, "Uno\n\n\\newpage\n\nDos\n\n\\newpage\n\nTres");
  await page.getByRole("radio", { name: "PDF" }).click();
  await expect(pageLabel(page)).toHaveText("1 de 3", compiled);

  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(pageLabel(page)).toHaveText("2 de 3");
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(pageLabel(page)).toHaveText("3 de 3");
  await expect(page.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  await page.getByRole("button", { name: "Página anterior" }).click();
  await expect(pageLabel(page)).toHaveText("2 de 3");
});

test("says when the PDF is out of date and recompiles on request", async ({ page }) => {
  await write(page, "# Primera versión");
  await page.getByRole("radio", { name: "PDF" }).click();
  await expect(previewPane(page)).toContainText("PDF al día", compiled);

  await editor(page).click();
  await page.keyboard.type(" con cambios");
  await expect(previewPane(page)).toContainText("El documento ha cambiado");
  await expect(previewPane(page)).toContainText("Desactualizado");

  await previewPane(page).getByRole("button", { name: "Recompilar" }).click();
  await expect(previewPane(page)).toContainText("PDF al día", compiled);
  await expect(previewPane(page)).not.toContainText("El documento ha cambiado");
});

test("compiles with the keyboard and opens the PDF", async ({ page }) => {
  await write(page, "# Con teclado");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("radio", { name: "PDF" })).toBeChecked();
  await expect(pdfPage(page, 1)).toBeVisible(compiled);
});

test("explains a LaTeX error and jumps to its line in the Markdown", async ({ page }) => {
  await write(page, "# Título\n\nTexto con \\comandoraro{x} dentro.\n\nFinal.");
  await page.getByRole("radio", { name: "PDF" }).click();

  const problems = previewPane(page).getByRole("alert");
  await expect(problems).toContainText(
    "LaTeX no conoce el comando \\comandoraro",
    compiled,
  );
  await expect(problems).toContainText("Undefined control sequence");
  await expect(previewPane(page)).toContainText("Con errores");
  await expect(pageLabel(page)).toHaveCount(0);

  await problems.getByRole("button", { name: "Ir a la línea 3 del Markdown" }).click();
  await expect(page.getByText("Línea 3, columna 1")).toBeVisible();
  await expect(editor(page)).toBeFocused();
});

test("includes the document's images in the PDF", async ({ page }) => {
  await write(page, "# Con figura");
  const choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Imagen" }).click();
  await (
    await choosing
  ).setFiles(path.join(__dirname, "fixtures", "Diagrama de prueba.png"));
  await expect(editor(page)).toContainText("diagrama-de-prueba.png");

  const download = await exportAs(page, "PDF");
  const pdf = await readFile(await download.path());
  expect(download.suggestedFilename()).toBe("con-figura.pdf");
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.toString("latin1")).toMatch(/\/Subtype\s*\/Image/);
});

test("exports Markdown and LaTeX named after the document", async ({ page }) => {
  await write(page, "# Mi informe\n\nTexto.");
  await expect(page.getByRole("banner")).toContainText("Mi informe");

  const markdown = await exportAs(page, "Markdown (.md)");
  expect(markdown.suggestedFilename()).toBe("mi-informe.md");
  expect(await readFile(await markdown.path(), "utf8")).toBe("# Mi informe\n\nTexto.");

  const latex = await exportAs(page, "LaTeX (.tex)");
  expect(latex.suggestedFilename()).toBe("mi-informe.tex");
  const source = await readFile(await latex.path(), "utf8");
  expect(source).toContain("\\section{Mi informe}");
  expect(source).toContain("\\end{document}");
});

test("exports the whole project as a ZIP that holds its sources and images", async ({
  page,
}) => {
  await write(page, "# Proyecto");
  const choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Imagen" }).click();
  await (
    await choosing
  ).setFiles(path.join(__dirname, "fixtures", "Diagrama de prueba.png"));
  await expect(editor(page)).toContainText("diagrama-de-prueba.png");

  const download = await exportAs(page, "Proyecto completo (.zip)");
  expect(download.suggestedFilename()).toBe("proyecto.zip");
  const files = unzipSync(new Uint8Array(await readFile(await download.path())));
  expect(Object.keys(files).sort()).toEqual([
    "proyecto/diagrama-de-prueba.png",
    "proyecto/proyecto.md",
    "proyecto/proyecto.tex",
  ]);
  expect(strFromU8(files["proyecto/proyecto.tex"]!)).toContain(
    "\\includegraphics{diagrama-de-prueba.png}",
  );
});

test("tells the reader when the PDF cannot be exported, and shows why", async ({
  page,
}) => {
  await write(page, "Texto con \\otrocomandoraro aquí.");
  await page.getByRole("button", { name: "Exportar" }).click();
  await page.getByRole("menuitem", { name: "PDF" }).click();

  await expect(page.getByText("No se pudo generar el PDF")).toBeVisible(compiled);
  await expect(previewPane(page).getByRole("alert")).toContainText("\\otrocomandoraro");
});
