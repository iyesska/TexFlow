import { expect, test, type Page } from "./support/fixtures";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const palette = (page: Page) => page.getByRole("dialog", { name: "Acciones" });
const guide = (page: Page) => page.getByRole("button", { name: /^Primeros pasos:/ });

test("finds and runs an action from the command palette", async ({
  page,
  openDocument,
}) => {
  await openDocument({ markdown: "# Datos\n\nUna tabla:" });
  await expect(editor(page)).toBeVisible();

  await page.keyboard.press("ControlOrMeta+k");
  await expect(palette(page)).toBeVisible();
  // Accents and case do not matter.
  await page.keyboard.type("version");
  await expect(palette(page).getByRole("option").first()).toHaveText(
    "Historial de versiones",
  );
  await page.getByRole("combobox", { name: "Busca una acción" }).fill("tabla");
  await page.keyboard.press("Enter");

  await expect(palette(page)).toBeHidden();
  await expect(editor(page)).toContainText("| Columna 1 | Columna 2 |");
  await expect(editor(page)).toBeFocused();
});

test("leaves Ctrl+K to the editor's links, and opens with Ctrl+P there", async ({
  page,
  openDocument,
}) => {
  await openDocument({ markdown: "# Enlaces\n\n" });
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("ControlOrMeta+k");
  await expect(editor(page)).toContainText("[texto del enlace](https://)");
  await expect(palette(page)).toBeHidden();

  await page.keyboard.press("ControlOrMeta+p");
  await expect(palette(page)).toBeVisible();
  await page.keyboard.type("historial");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Historial de versiones" }),
  ).toBeVisible();
});

test("lists the keyboard shortcuts on ?", async ({ page, openDocument }) => {
  await openDocument();
  await expect(editor(page)).toBeVisible();
  // In the text, "?" is just a character.
  await editor(page).click();
  await page.keyboard.type("?");
  const shortcuts = page.getByRole("dialog", { name: "Atajos de teclado" });
  await expect(shortcuts).toBeHidden();

  await page.getByRole("button", { name: "Ajustes de vista" }).click();
  await page.getByRole("menuitem", { name: "Atajos de teclado" }).click();
  await expect(shortcuts).toBeVisible();
  await expect(shortcuts).toContainText("Compilar el PDF");
  await page.keyboard.press("Escape");

  await page.locator("body").press("?");
  await expect(shortcuts).toBeVisible();
});

test("ticks off the first steps as they are done, and can be put away", async ({
  page,
  openDocument,
}) => {
  await openDocument({ markdown: "# Cuaderno\n\nTexto." });
  await expect(guide(page)).toHaveAccessibleName("Primeros pasos: 0 de 6 hechos");

  await editor(page).click();
  await page.keyboard.type("Más ");
  await expect(guide(page)).toHaveAccessibleName("Primeros pasos: 1 de 6 hechos");
  await page.keyboard.press("ControlOrMeta+p");
  await page.keyboard.press("Escape");
  await expect(guide(page)).toHaveAccessibleName("Primeros pasos: 2 de 6 hechos");

  await guide(page).click();
  // The next step to do comes with a way to do it.
  await expect(page.getByRole("button", { name: "Abrir Diseño" })).toBeVisible();
  await page.getByRole("button", { name: "Ocultar la guía" }).click();
  await expect(guide(page)).toBeHidden();

  // It stays away after a reload, and comes back from the view menu.
  await page.reload();
  await expect(editor(page)).toBeVisible();
  await expect(guide(page)).toBeHidden();
  await page.getByRole("button", { name: "Ajustes de vista" }).click();
  await page.getByRole("menuitem", { name: "Primeros pasos" }).click();
  await expect(page.getByRole("button", { name: "Abrir Diseño" })).toBeVisible();
});
