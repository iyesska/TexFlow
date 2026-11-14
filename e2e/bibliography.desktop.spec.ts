import { expect, test, type Page } from "./support/fixtures";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const preview = (page: Page) => page.getByRole("article", { name: "Documento" });
const panel = (page: Page) => page.getByRole("dialog", { name: "Referencias" });

const KNUTH =
  "@book{knuth1984, author = {Knuth, Donald E.}, title = {The {\\TeX}book}, publisher = {Addison-Wesley}, year = {1984}}";

async function storedBibliography(page: Page, id: string): Promise<string> {
  const response = await page.request.get(`/api/documents/${id}`);
  return (await response.json()).document.bibliography;
}

test("adds a reference, cites it, and the preview lists it", async ({
  page,
  openDocument,
}) => {
  const id = await openDocument({ markdown: "# Series\n\nComo se demuestra en " });
  await page.getByRole("button", { name: "Referencias del documento" }).click();
  await panel(page).getByRole("button", { name: "Nueva referencia" }).click();

  const form = page.getByRole("dialog", { name: "Nueva referencia" });
  await form.getByRole("textbox", { name: "Autores" }).fill("Pérez, Ana\nGómez, Juan");
  await form.getByRole("textbox", { name: "Título" }).fill("Series convergentes");
  await form.getByRole("textbox", { name: "Revista" }).fill("Revista de Matemáticas");
  await form.getByRole("textbox", { name: "Año" }).fill("2020");
  // A key is suggested from the first author, the year and the title.
  await expect(form.getByRole("textbox", { name: "Clave" })).toHaveValue(
    "perez2020series",
  );
  await form.getByRole("button", { name: "Añadir referencia" }).click();

  await editor(page).click();
  await page.keyboard.press("Control+End");
  await panel(page).getByRole("button", { name: "Citar" }).click();
  await expect(editor(page)).toContainText("en [@perez2020series]");

  await expect(preview(page).locator(".citation")).toHaveText("(Pérez y Gómez 2020)");
  await expect(preview(page).getByRole("heading", { name: "Referencias" })).toBeVisible();
  await expect(preview(page).locator(".csl-entry")).toContainText(
    "«Series convergentes». Revista de Matemáticas",
  );
  await expect
    .poll(() => storedBibliography(page, id))
    .toContain("@article{perez2020series,");
});

test("imports a .bib file, and offers to add the keys the text still lacks", async ({
  page,
  openDocument,
}) => {
  await openDocument({ markdown: "# Notas\n\nVéase [@knuth1984] y [@lamport1994]." });
  await page.getByRole("button", { name: "Referencias del documento" }).click();
  await expect(
    panel(page).getByText("El texto cita claves que no están aquí"),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("button", { name: "Añadir la referencia knuth1984" }),
  ).toBeVisible();

  const chooser = page.waitForEvent("filechooser");
  await panel(page).getByRole("button", { name: "Importar .bib" }).click();
  await (
    await chooser
  ).setFiles({
    name: "fuentes.bib",
    mimeType: "application/x-bibtex",
    buffer: Buffer.from(KNUTH),
  });
  await expect(page.getByText("1 referencia añadida")).toBeVisible();

  const list = panel(page).getByRole("list", { name: "Referencias" });
  await expect(list).toContainText("The TeXbook");
  await expect(list).toContainText("Citada en el texto");
  await expect(
    panel(page).getByRole("button", { name: "Añadir la referencia knuth1984" }),
  ).toBeHidden();
  // Adding the other one opens the form with its key filled in.
  await panel(page)
    .getByRole("button", { name: "Añadir la referencia lamport1994" })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Nueva referencia" })
      .getByRole("textbox", { name: "Clave" }),
  ).toHaveValue("lamport1994");
});

test("formats citations in the style the design asks for", async ({
  page,
  openDocument,
}) => {
  await openDocument({
    markdown: "# Nota\n\nComo dice Knuth [@knuth1984, p. 12].",
    bibliography: KNUTH,
  });
  await expect(preview(page).locator(".citation")).toHaveText("(Knuth 1984, 12)");

  await page.getByRole("button", { name: "Diseño del documento" }).click();
  await page.getByRole("combobox", { name: "Estilo de las citas" }).click();
  await page.getByRole("option", { name: /IEEE/ }).click();
  await expect(preview(page).locator(".citation")).toHaveText("[1, p. 12]");
});
