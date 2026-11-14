import { expect, test, type Page } from "./support/fixtures";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const saved = (page: Page) => page.getByRole("status").filter({ hasText: "Guardado" });
const history = (page: Page) =>
  page.getByRole("dialog", { name: "Historial de versiones" });

async function storedMarkdown(page: Page, id: string): Promise<string> {
  const response = await page.request.get(`/api/documents/${id}`);
  return (await response.json()).document.markdown;
}

async function versionLabels(page: Page, id: string): Promise<string[]> {
  const response = await page.request.get(`/api/documents/${id}/versions`);
  const { versions } = (await response.json()) as {
    versions: { kind: string; label: string | null }[];
  };
  return versions.map(({ kind, label }) => label ?? kind);
}

async function typeAtEnd(page: Page, text: string) {
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(text);
  await expect(saved(page)).toBeVisible();
}

test("keeps versions, compares one with the text and restores it", async ({
  page,
  openDocument,
}) => {
  const id = await openDocument({ markdown: "# Informe\n\nLa serie converge deprisa." });
  // The first save keeps the document as it was opened.
  await typeAtEnd(page, "\n\nUn párrafo nuevo.");

  await page.getByRole("button", { name: "Historial de versiones" }).click();
  const option = history(page).getByRole("option", { name: /Guardado automático/ });
  await expect(option).toBeVisible();
  await option.click();
  const changes = history(page).getByRole("region", {
    name: "Cambios desde esta versión",
  });
  await expect(changes).toContainText("Añadida desde entonces: Un párrafo nuevo.");

  // A version with a name, of the text as it is now.
  await history(page).getByRole("button", { name: "Guardar esta versión" }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la versión" })
    .fill("Antes de revisar");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    history(page).getByRole("option", { name: /Antes de revisar/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(history(page)).toContainText(
    "El texto no ha cambiado desde esta versión.",
  );

  // Restore the automatic one: the text goes back to how it was opened.
  await option.click();
  await history(page).getByRole("button", { name: "Restaurar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Restaurar" }).click();
  await expect(history(page)).toBeHidden();
  await expect(editor(page)).not.toContainText("Un párrafo nuevo.");
  await expect(saved(page)).toBeVisible();
  expect(await storedMarkdown(page, id)).toBe("# Informe\n\nLa serie converge deprisa.");
  expect(await versionLabels(page, id)).toEqual([
    "before-restore",
    "Antes de revisar",
    "auto",
  ]);

  // And the restore can be undone from its notice.
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(editor(page)).toContainText("Un párrafo nuevo.");
  await expect.poll(() => storedMarkdown(page, id)).toContain("Un párrafo nuevo.");
});

test("marks the words that changed inside a paragraph", async ({
  page,
  openDocument,
}) => {
  await openDocument({ markdown: "# Informe\n\nLa serie converge deprisa." });
  await editor(page).click();
  await page.keyboard.press("Control+End");
  for (let i = 0; i < "deprisa.".length; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("despacio.");
  await expect(saved(page)).toBeVisible();

  await page.getByRole("button", { name: "Historial de versiones" }).click();
  const changes = history(page).getByRole("region", {
    name: "Cambios desde esta versión",
  });
  await expect(changes.locator("del")).toHaveText("deprisa");
  await expect(changes.locator("ins")).toHaveText("despacio");

  // The whole text of the version is a click away.
  await history(page).getByRole("radio", { name: "Texto" }).click();
  await expect(history(page)).toContainText("La serie converge deprisa.");
});
