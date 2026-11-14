import path from "node:path";

import { expect, test, type Page } from "./support/fixtures";

const editor = (page: Page) => page.getByRole("textbox", { name: "Editor Markdown" });
const preview = (page: Page) => page.getByRole("article", { name: "Documento" });
const previewPane = (page: Page) =>
  page.getByRole("region", { name: "Vista previa", exact: true });
const fixture = (name: string) => path.join(__dirname, "fixtures", name);

/** Replaces the whole document with `text`. */
async function write(page: Page, text: string) {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(text);
}

async function pickImage(page: Page, file: string) {
  const choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Imagen", exact: true }).click();
  await (await choosing).setFiles(fixture(file));
}

test.beforeEach(async ({ page, openDocument }) => {
  await openDocument();
  await expect(editor(page)).toBeVisible();
});

test("typesets the sample document, with its formulas and table", async ({ page }) => {
  await expect(
    preview(page).getByRole("heading", { name: "Introducción a TexFlow" }),
  ).toBeVisible();
  await expect(preview(page).locator(".katex").first()).toBeVisible();
  await expect(preview(page).locator(".katex-display")).toHaveCount(1);
  await expect(preview(page).getByRole("table")).toContainText("Euler");
  await expect(previewPane(page).getByText("Actualizada", { exact: true })).toBeVisible();
  await expect(previewPane(page)).not.toContainText("aviso");
});

test("follows the document as it is written", async ({ page }) => {
  await write(page, "# Hola\n\nSea $x^2$ un **cuadrado**.");
  await expect(preview(page).getByRole("heading", { name: "Hola" })).toBeVisible();
  await expect(preview(page).locator("strong")).toHaveText("cuadrado");
  await expect(preview(page).locator(".katex")).toHaveCount(1);
  await expect(preview(page)).not.toContainText("Introducción a TexFlow");
});

test("sets the YAML metadata as a title block", async ({ page }) => {
  await write(page, "---\ntitle: Mi tesis\nauthor: Ada Lovelace\n---\n\nTexto.");
  await expect(preview(page).locator(".title-block .title")).toHaveText("Mi tesis");
  await expect(preview(page).locator(".title-block .author")).toHaveText("Ada Lovelace");
});

test("never runs or links to script from the document", async ({ page }) => {
  await write(
    page,
    '[malo](javascript:window.__xss=1) <img src=x onerror="window.__xss=1"> <script>window.__xss=1</script> fin',
  );
  await expect(preview(page)).toContainText("fin");
  await expect(preview(page).locator("script, [onerror], [onclick]")).toHaveCount(0);
  await expect(preview(page).getByRole("link", { name: "malo" })).toHaveCount(0);
  await expect(preview(page)).toContainText("malo");
  expect(await page.evaluate(() => "__xss" in window)).toBe(false);
});

test("zooms in and out and fits the pane again", async ({ page }) => {
  const zoom = page.getByLabel("Zoom");
  await expect(preview(page)).toBeVisible();
  await expect(zoom).toHaveText(/\d+ %/);
  const fitted = await zoom.innerText();
  const sheetWidth = async () => (await preview(page).boundingBox())!.width;
  const before = await sheetWidth();

  await page.getByRole("button", { name: "Acercar" }).click();
  await expect(zoom).not.toHaveText(fitted);
  expect(await sheetWidth()).toBeGreaterThan(before);

  await page.getByRole("button", { name: "Ajustar al ancho" }).click();
  await expect(zoom).toHaveText(fitted);
  await expect(page.getByRole("button", { name: "Ajustar al ancho" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("adds an image to the document and keeps it after a reload", async ({ page }) => {
  await write(page, "# Con imagen");
  await pickImage(page, "Diagrama de prueba.png");

  await expect(editor(page)).toContainText(
    "![Diagrama de prueba](diagrama-de-prueba.png)",
  );
  const image = preview(page).getByRole("img", { name: "Diagrama de prueba" });
  await expect(image).toBeVisible();
  // Served by the application, from the image stored with the document.
  await expect(image).toHaveAttribute(
    "src",
    /^\/api\/documents\/[a-z0-9]+\/assets\/diagrama-de-prueba\.png$/,
  );
  await expect(preview(page).locator("figcaption")).toHaveText("Diagrama de prueba");
  // The image really decoded: it has its natural size.
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(
    120,
  );

  await expect(page.getByRole("banner").getByRole("status")).toHaveText("Guardado");
  await page.reload();
  await expect(
    preview(page).getByRole("img", { name: "Diagrama de prueba" }),
  ).toBeVisible();
});

test("refuses a file that only claims to be an image", async ({ page }) => {
  await write(page, "# Sin imagen");
  await pickImage(page, "no-es-imagen.png");
  await expect(
    page.getByText("«no-es-imagen.png» no es una imagen PNG o JPEG"),
  ).toBeVisible();
  await expect(editor(page)).not.toContainText("no-es-imagen");
});

test("explains images it cannot show instead of loading them", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await write(page, "![remota](https://example.com/a.png)\n\n![local](falta.png)");
  await expect(preview(page)).toContainText("Imagen remota");
  await expect(preview(page)).toContainText("Imagen no encontrada.");
  await expect(preview(page).locator("img")).toHaveCount(0);
  expect(requests.filter((url) => url.includes("example.com"))).toEqual([]);
});
