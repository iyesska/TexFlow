import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const saveStatus = (page: Page) => page.getByRole("banner").getByRole("status");

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

test("opens with the sample document", async ({ page }) => {
  await expect(editor(page)).toContainText("Introducción a TexFlow");
  await expect(page.getByRole("banner")).toContainText("Introducción a TexFlow");
  await expect(saveStatus(page)).toHaveText("Guardado");
});

test("saves automatically and restores the document after a reload", async ({ page }) => {
  await write(page, "# Mi tesis\n\nPrimer párrafo.");
  await expect(saveStatus(page)).toHaveText("Sin guardar");
  await expect(saveStatus(page)).toHaveText("Guardado");
  await expect(page.getByRole("banner")).toContainText("Mi tesis");

  await page.reload();
  await expect(editor(page)).toContainText("Primer párrafo.");
  await expect(editor(page)).not.toContainText("Introducción a TexFlow");
});

test("saves immediately with the keyboard", async ({ page }) => {
  await write(page, "urgente");
  await page.keyboard.press("ControlOrMeta+s");
  await expect(saveStatus(page)).toHaveText("Guardado", { timeout: 500 });
});

test("formats with the keyboard and with the toolbar", async ({ page }) => {
  await write(page, "palabra");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("ControlOrMeta+b");
  await expect(editor(page)).toHaveText("**palabra**");

  await page.getByRole("button", { name: "Cita" }).click();
  await expect(editor(page)).toHaveText("> **palabra**");

  // The toolbar gives focus back to the editor, so typing continues in place.
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" fin");
  await expect(editor(page)).toHaveText("> **palabra** fin");
});

test("inserts a table from the slash menu", async ({ page }) => {
  await write(page, "/tab");
  await page.getByRole("option", { name: /\/tabla/ }).click();
  await expect(editor(page)).toContainText("| Columna 1 | Columna 2 |");
});

test("continues a list on Enter", async ({ page }) => {
  await write(page, "- uno");
  await page.keyboard.press("Enter");
  await page.keyboard.type("dos");
  await expect(editor(page).locator(".cm-line")).toHaveText(["- uno", "- dos"]);
});

test("highlights math apart from prose", async ({ page }) => {
  await write(page, "Sea $x^2$ y cuesta $5.");
  await expect(editor(page).locator(".tok-math").first()).toContainText("x^2");
  await expect(editor(page).locator(".tok-math").filter({ hasText: "5" })).toHaveCount(0);
});

test("shows the cursor position and the word count", async ({ page }) => {
  await write(page, "uno dos\ntres");
  const region = page.getByRole("region").filter({ has: editor(page) });
  await expect(region).toContainText("Línea 2, columna 5");
  await expect(region).toContainText("3 palabras");
});

test("keeps the text and the undo history when the pane is hidden and shown", async ({
  page,
}) => {
  await write(page, "antes");
  await page.keyboard.type(" después");
  await page.keyboard.press("Alt+Digit1");
  await expect(editor(page)).toBeHidden();

  await page.keyboard.press("Alt+Digit1");
  await expect(editor(page)).toHaveText("antes después");
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor(page)).not.toHaveText("antes después");
});
