import { createAccount, createDocument, createFolder } from "./support/database";
import { expect, test, type Page } from "./support/fixtures";

// The list of documents; the toasts and the hidden pages kept for going back are
// elsewhere.
const list = (page: Page) => page.getByRole("main").getByRole("list").first();
const row = (page: Page, title: string) =>
  list(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
const titles = (page: Page) => list(page).getByRole("link").allInnerTexts();
const folders = (page: Page) => page.getByRole("navigation", { name: "Carpetas" });

async function actOn(page: Page, title: string, action: string) {
  await page.getByRole("button", { name: `Acciones de «${title}»` }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

test("lists the account's documents, most recently changed first", async ({
  page,
  account,
}) => {
  // An hour apart: two inserts in a row can share a timestamp, and then no order.
  await createDocument(account.id, {
    markdown: "# Primero",
    updatedAt: new Date(Date.now() - 60 * 60 * 1000),
  });
  await createDocument(account.id, { markdown: "# Segundo" });
  await page.goto("/documents");

  await expect.poll(() => titles(page)).toEqual(["Segundo", "Primero"]);
  await page.getByRole("link", { name: "Primero" }).click();
  await expect(page).toHaveURL(/\/documents\/[a-z0-9]+$/);
  await expect(page.getByRole("button", { name: "Primero", exact: true })).toBeVisible();
});

test("welcomes an empty account with the templates to start from", async ({
  page,
  account,
}) => {
  void account;
  await page.goto("/documents");
  await expect(
    page.getByRole("heading", { name: "Aún no tienes documentos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Informe matemático" }).click();

  await expect(page).toHaveURL(/\/documents\/[a-z0-9]+$/);
  await expect(page.getByRole("button", { name: "Documento sin título" })).toBeVisible();
  await page.getByRole("button", { name: "Diseño del documento" }).click();
  await expect(
    page.getByRole("dialog").getByRole("radio", { name: /^Informe matemático/ }),
  ).toBeChecked();
});

test("creates a document in the folder on screen", async ({ page, account }) => {
  await createFolder(account.id, "Tesis");
  await createDocument(account.id, { markdown: "# Otro" });
  await page.goto("/documents");
  await folders(page)
    .getByRole("button", { name: /^Tesis,/ })
    .click();
  await expect(page.getByText("Esta carpeta está vacía")).toBeVisible();
  await page
    .getByRole("button", { name: "Nuevo documento", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/documents\/[a-z0-9]+$/);

  await page.getByRole("link", { name: "Tus documentos" }).click();
  await folders(page)
    .getByRole("button", { name: /^Tesis,/ })
    .click();
  await expect.poll(() => titles(page)).toEqual(["Documento sin título"]);
});

test("organizes documents in folders, and keeps them when a folder goes", async ({
  page,
  account,
}) => {
  await createDocument(account.id, { markdown: "# Capítulo 1" });
  await page.goto("/documents");

  await folders(page).getByRole("button", { name: "Nueva carpeta" }).click();
  await page.getByRole("textbox", { name: "Nombre de la carpeta" }).fill("Tesis");
  await page.getByRole("button", { name: "Crear carpeta" }).click();
  await expect(page.getByRole("heading", { name: "Tesis", level: 1 })).toBeVisible();

  await folders(page)
    .getByRole("button", { name: /^Todos los documentos,/ })
    .click();
  await actOn(page, "Capítulo 1", "Mover a");
  await page.getByRole("menuitem", { name: "Tesis" }).click();
  await expect(
    folders(page).getByRole("button", { name: "Tesis, 1 documento" }),
  ).toBeVisible();
  await expect(row(page, "Capítulo 1")).toContainText("Tesis");

  await folders(page)
    .getByRole("button", { name: /^Tesis,/ })
    .click();
  await page
    .getByRole("button", { name: "Acciones de la carpeta «Tesis»" })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Eliminar carpeta…" }).click();
  await page.getByRole("button", { name: "Eliminar carpeta" }).click();

  await expect(page.getByRole("heading", { name: "Todos los documentos" })).toBeVisible();
  await expect.poll(() => titles(page)).toEqual(["Capítulo 1"]);
  await expect(
    folders(page).getByRole("button", { name: "Fuera de las carpetas, 1 documento" }),
  ).toBeVisible();
});

test("renames, duplicates and deletes documents", async ({ page, account }) => {
  await createDocument(account.id, { markdown: "# Borrador" });
  await page.goto("/documents");

  await actOn(page, "Borrador", "Cambiar nombre…");
  await page.getByRole("textbox", { name: "Nombre" }).fill("Versión final");
  await page.getByRole("button", { name: "Cambiar nombre" }).click();
  await expect(row(page, "Versión final")).toBeVisible();

  // The same actions are on the right-click menu.
  await page.getByRole("link", { name: "Versión final" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Duplicar" }).click();
  await expect(row(page, "Versión final (copia)")).toBeVisible();

  await actOn(page, "Versión final (copia)", "Eliminar…");
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("No se puede deshacer");
  await confirm.getByRole("button", { name: "Eliminar" }).click();
  await expect.poll(() => titles(page)).toEqual(["Versión final"]);

  // It is gone from the server too.
  await page.reload();
  await expect.poll(() => titles(page)).toEqual(["Versión final"]);
});

test("finds documents by title, regardless of accents and case", async ({
  page,
  account,
}) => {
  await createDocument(account.id, { markdown: "# Análisis de datos" });
  await createDocument(account.id, { markdown: "# Apuntes" });
  await page.goto("/documents");

  // "/" jumps to the search once the page has come to life.
  const search = page.getByRole("searchbox", { name: "Buscar documentos por título" });
  await expect(async () => {
    await page.keyboard.press("/");
    await expect(search).toBeFocused({ timeout: 500 });
  }).toPass();
  await page.keyboard.type("ANALISIS");
  await expect.poll(() => titles(page)).toEqual(["Análisis de datos"]);
  await page.keyboard.press("Escape");
  await page.getByRole("searchbox").fill("tesis doctoral");
  await expect(page.getByText("Ningún título contiene «tesis doctoral»")).toBeVisible();
});

test("never shows or opens another account's documents", async ({ page, account }) => {
  void account;
  const stranger = await createAccount();
  const id = await createDocument(stranger.id, { markdown: "# Privado" });

  await page.goto("/documents");
  await expect(page.getByRole("link", { name: "Privado" })).toHaveCount(0);
  await page.goto(`/documents/${id}`);
  await expect(
    page.getByRole("heading", { name: "Esta página no existe" }),
  ).toBeVisible();
  const response = await page.request.get(`/api/documents/${id}`);
  expect(response.status()).toBe(404);
});

test("imports the document this browser kept before accounts existed", async ({
  page,
  account,
}) => {
  void account;
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem(
      "texflow:document:local",
      JSON.stringify({
        id: "local",
        markdown: "# Mi tesis\n\nEscrita sin cuenta.",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    );
  });
  await page.goto("/documents");
  await expect(page.getByText("Este navegador guarda «Mi tesis»")).toBeVisible();
  await page.getByRole("button", { name: "Importar" }).click();

  await expect(row(page, "Mi tesis")).toBeVisible();
  await page.reload();
  await expect(row(page, "Mi tesis")).toBeVisible();
  await expect(page.getByText("Este navegador guarda")).toHaveCount(0);
});
