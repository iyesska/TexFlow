import { createAccount, createDocument } from "./support/database";
import { expect, test, type Page } from "./support/fixtures";

const PASSWORD = "una-clave-de-prueba";

const emailField = (page: Page) =>
  page.getByRole("textbox", { name: "Correo electrónico" });
const passwordField = (page: Page) =>
  page.getByRole("textbox", { name: "Contraseña", exact: true });

test("sends a signed-out visitor to sign in, then on to the page they asked for", async ({
  page,
}) => {
  const account = await createAccount({ password: PASSWORD });
  const id = await createDocument(account.id, { markdown: "# Mi informe\n\nTexto." });

  await page.goto(`/documents/${id}`);
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await emailField(page).fill(account.email.toUpperCase());
  await passwordField(page).fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(new RegExp(`/documents/${id}$`));
  await expect(page.getByRole("button", { name: "Mi informe" })).toBeVisible();
});

test("says when the email or the password is wrong, and keeps the email", async ({
  page,
}) => {
  const account = await createAccount({ password: PASSWORD });
  await page.goto("/login");
  await emailField(page).fill(account.email);
  await passwordField(page).fill("no-es-la-clave");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(
    page.getByText("El correo o la contraseña no son correctos."),
  ).toBeVisible();
  await expect(emailField(page)).toHaveValue(account.email);
  await expect(page).toHaveURL(/\/login/);
});

test("checks the sign-up form before sending it anywhere", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
  await expect(page.getByText("Escribe una dirección de correo válida.")).toBeVisible();
  await expect(
    page.getByText("La contraseña necesita al menos 8 caracteres."),
  ).toBeVisible();
});

test("creates an account that starts with a first document", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("textbox", { name: "Nombre" }).fill("Lucía Pérez");
  await emailField(page).fill(`alta-${Date.now()}@texflow.test`);
  await passwordField(page).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByRole("link", { name: "Introducción a TexFlow" })).toBeVisible();
  await page.getByRole("button", { name: "Tu cuenta" }).click();
  await expect(page.getByRole("menu")).toContainText("Lucía Pérez");
});

test("signs out, after which the documents are out of reach", async ({
  page,
  account,
}) => {
  await page.goto("/documents");
  await page.getByRole("button", { name: "Tu cuenta" }).click();
  await expect(page.getByRole("menu")).toContainText(account.email);
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/documents");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});

test("takes a signed-in visitor of the sign-in page to their documents", async ({
  page,
  account,
}) => {
  void account;
  await page.goto("/login");
  await expect(page).toHaveURL(/\/documents$/);
});
