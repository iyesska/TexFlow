import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const latexPane = (page: Page) =>
  page.getByRole("region", { name: "LaTeX", exact: true });
const panel = (page: Page) => page.getByRole("dialog", { name: "Diseño del documento" });
const template = (page: Page, name: string) =>
  panel(page).getByRole("radio", { name: new RegExp(`^${name}`) });
const body = (page: Page) => page.getByRole("article", { name: "Documento" });
const cover = (page: Page) => page.getByRole("article", { name: "Portada" });

/**
 * The whole generated LaTeX. The viewer only draws the lines in view, so the source is
 * read the way a writer would take it: with the copy button.
 */
async function latexSource(page: Page): Promise<string> {
  await expect(latexPane(page)).toContainText("Actualizado");
  await latexPane(page).getByRole("button", { name: "Copiar código" }).click();
  return page.evaluate(() => navigator.clipboard.readText());
}

async function openDesign(page: Page) {
  await page.getByRole("button", { name: "Diseño del documento" }).click();
  await expect(panel(page)).toBeVisible();
}

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
  await expect(body(page)).toContainText("Texto y listas");
});

test("opens with the academic paper, and lists every template", async ({ page }) => {
  await openDesign(page);
  await expect(template(page, "Artículo académico")).toBeChecked();
  await expect(
    panel(page)
      .getByRole("radio", { name: /./ })
      .filter({ has: page.locator("[aria-hidden]") }),
  ).toHaveCount(7);
  await expect(panel(page)).toContainText("Ajustes de Artículo académico");
  await expect(panel(page).getByRole("button", { name: "Restablecer" })).toBeDisabled();
});

test("applies a template to the preview and the LaTeX, and keeps it after a reload", async ({
  page,
}) => {
  await openDesign(page);
  await template(page, "Tesis").click();
  await expect(template(page, "Tesis")).toBeChecked();

  // A thesis: chapters, a cover page of its own, a table of contents.
  await expect(body(page)).toHaveAttribute("data-structure", "book");
  await expect(cover(page)).toContainText("Introducción a TexFlow");
  await expect(body(page).getByRole("navigation")).toContainText("Índice");
  await expect.poll(() => latexSource(page)).toContain("]{book}");
  expect(await latexSource(page)).toContain("\\setmainfont{texgyrepagella}");

  await page.reload();
  await expect(body(page)).toHaveAttribute("data-structure", "book");
  await openDesign(page);
  await expect(template(page, "Tesis")).toBeChecked();
});

test("changes one setting and restores the template's own", async ({ page }) => {
  await openDesign(page);
  const twelve = panel(page).getByRole("radio", { name: "12 pt", exact: true });
  await twelve.click();
  await expect(twelve).toBeChecked();
  await expect(body(page)).toHaveCSS("font-size", "16px");
  await expect(panel(page)).toContainText("Artículo académico, con ajustes propios");

  await panel(page).getByRole("button", { name: "Restablecer" }).click();
  await expect(
    panel(page).getByRole("radio", { name: "11 pt", exact: true }),
  ).toBeChecked();
  await expect(panel(page)).toContainText("Ajustes de Artículo académico");
});

test("offers to undo a template switch that drops settings changed by hand", async ({
  page,
}) => {
  await openDesign(page);
  await panel(page).getByRole("radio", { name: "2", exact: true }).click();
  await template(page, "Documento mínimo").click();
  await expect(page.getByText("Plantilla «Documento mínimo» aplicada")).toBeVisible();

  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(template(page, "Artículo académico")).toBeChecked();
  await expect(panel(page).getByRole("radio", { name: "2", exact: true })).toBeChecked();
});

test("refuses margins that leave no room for the text", async ({ page }) => {
  await openDesign(page);
  await panel(page).getByRole("radio", { name: "A5" }).click();
  const left = panel(page).getByLabel("Izquierdo");
  await left.fill("45");
  await left.press("Tab");
  const right = panel(page).getByLabel("Derecho");
  await right.fill("45");
  await right.press("Tab");

  await expect(panel(page).getByRole("alert")).toContainText("izquierdo y derecho");
  await expect(right).toHaveValue("25");
});

test("sets running heads and footers from the menus", async ({ page }) => {
  await openDesign(page);
  await panel(page).getByRole("combobox", { name: "Pie de página" }).click();
  await page.getByRole("option", { name: "Número y total, como «3 de 12»" }).click();
  await expect.poll(() => latexSource(page)).toContain("\\pageref*{LastPage}");
});

test("writes the document in English when its language is English", async ({ page }) => {
  await openDesign(page);
  await panel(page).getByRole("radio", { name: "English" }).click();
  await expect(body(page)).toHaveAttribute("lang", "en");
  await expect
    .poll(() => latexSource(page))
    .toContain("\\babelprovide[main,import]{english}");
});

test("stays open while the preview beside it is used, and closes with Escape", async ({
  page,
}) => {
  await openDesign(page);
  await template(page, "Trabajo universitario").click();
  // The preview stays in view beside the panel, follows the change and takes clicks.
  await expect(cover(page)).toContainText("Introducción a TexFlow");
  await body(page).click();
  await expect(panel(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
});

test("marks the PDF out of date when the design changes", async ({ page }) => {
  test.setTimeout(90_000);
  await page.getByRole("radio", { name: "PDF" }).click();
  const preview = page.getByRole("region", { name: "Vista previa", exact: true });
  await expect(preview).toContainText("PDF al día", { timeout: 60_000 });

  await openDesign(page);
  await template(page, "Informe matemático").click();
  await expect(preview).toContainText("Desactualizado");
});
