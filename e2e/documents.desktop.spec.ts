import { expect, test, type Page } from "./support/fixtures";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const saved = (page: Page) => page.getByRole("status").filter({ hasText: "Guardado" });

async function documentMarkdown(page: Page, id: string): Promise<string> {
  const response = await page.request.get(`/api/documents/${id}`);
  return (await response.json()).document.markdown;
}

/** The text of the document's version with this name, or null if there is none. */
async function versionMarkdown(page: Page, id: string, label: string) {
  const list = await page.request.get(`/api/documents/${id}/versions`);
  const { versions } = (await list.json()) as {
    versions: { id: string; label: string }[];
  };
  const version = versions.find((each) => each.label === label);
  if (!version) return null;
  const one = await page.request.get(`/api/documents/${id}/versions/${version.id}`);
  return (await one.json()).version.markdown as string;
}

test("names the document from the top bar, and the library follows", async ({
  page,
  openDocument,
}) => {
  await openDocument({ markdown: "# Notas\n\nTexto." });
  await page.getByRole("button", { name: "Notas" }).click();
  await page
    .getByRole("textbox", { name: "Nombre del documento" })
    .fill("Diario de campo");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Diario de campo" })).toBeVisible();
  await expect(page).toHaveTitle("Diario de campo — TexFlow");

  await page.getByRole("link", { name: "Tus documentos" }).click();
  await expect(page.getByRole("link", { name: "Diario de campo" })).toBeVisible();
});

test("saves before going back to the library", async ({ page, openDocument }) => {
  const id = await openDocument({ markdown: "# Antes\n\nTexto." });
  await editor(page).click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("End");
  await page.keyboard.type(" y después");
  // Straight away, before the pause that triggers a save.
  await page.getByRole("link", { name: "Tus documentos" }).click();

  await expect(page.getByRole("link", { name: "Antes y después" })).toBeVisible();
  expect(await documentMarkdown(page, id)).toContain("# Antes y después");
});

test("asks which version stays when another tab saved first", async ({
  page,
  context,
  openDocument,
}) => {
  const id = await openDocument({ markdown: "# Informe\n\nPrimera versión." });
  await expect(editor(page)).toBeVisible();

  const other = await context.newPage();
  await other.goto(`/documents/${id}`);
  await editor(other).click();
  await other.keyboard.press("Control+End");
  await other.keyboard.type(" Desde la otra pestaña.");
  await expect(saved(other)).toBeVisible();

  await page.bringToFront();
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Desde esta.");
  await expect(
    page.getByRole("status").filter({ hasText: "Cambiado en otro sitio" }),
  ).toBeVisible();
  // Nothing was written over the other tab's version.
  expect(await documentMarkdown(page, id)).toContain("Desde la otra pestaña.");

  await page.getByRole("button", { name: "Resolver" }).first().click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Conservar la mía" })
    .click();
  await expect(saved(page)).toBeVisible();
  const markdown = await documentMarkdown(page, id);
  expect(markdown).toContain("Desde esta.");
  expect(markdown).not.toContain("Desde la otra pestaña.");
  // The other tab's version is not lost: the history has it.
  expect(
    await versionMarkdown(page, id, "Guardada desde otra pestaña o dispositivo"),
  ).toContain("Desde la otra pestaña.");
});

test("loads the other version when asked to", async ({ page, context, openDocument }) => {
  const id = await openDocument({ markdown: "# Informe\n\nPrimera versión." });
  await expect(editor(page)).toBeVisible();

  const other = await context.newPage();
  await other.goto(`/documents/${id}`);
  await editor(other).click();
  await other.keyboard.press("Control+End");
  await other.keyboard.type(" La buena.");
  await expect(saved(other)).toBeVisible();

  await page.bringToFront();
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" La que sobra.");
  await page.getByRole("button", { name: "Resolver" }).first().click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cargar la otra versión" })
    .click();

  await expect(editor(page)).toContainText("La buena.");
  await expect(editor(page)).not.toContainText("La que sobra.");
  await expect(saved(page)).toBeVisible();
  // What this tab had not saved is kept in the history.
  expect(
    await versionMarkdown(page, id, "Cambios de esta pestaña que no se guardaron"),
  ).toContain("La que sobra.");
});
