import AxeBuilder from "@axe-core/playwright";

import { createDocument } from "./support/database";
import { expect, test, type Page } from "./support/fixtures";

/**
 * Every screen and dialog, checked with axe against WCAG 2.2 A and AA, in both
 * themes. A violation fails with what is wrong and where.
 */

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** With a dialog open, the page behind it is dimmed and inert: the dialog is audited. */
const DIALOG = '[role="dialog"]';

async function audit(page: Page, scope?: string) {
  // A notice fading in has, for a moment, the contrast of half its opacity.
  await page.waitForFunction(() =>
    [...document.querySelectorAll("[data-sonner-toast]")].every(
      (toast) => getComputedStyle(toast).opacity === "1",
    ),
  );
  const builder = new AxeBuilder({ page }).withTags(WCAG);
  const { violations } = await (scope ? builder.include(scope) : builder).analyze();
  const report = violations.map(({ id, help, nodes }) => ({
    id,
    help,
    targets: nodes.slice(0, 5).map(({ target, failureSummary }) => ({
      target: target.join(" "),
      failureSummary,
    })),
  }));
  expect(report, JSON.stringify(report, null, 2)).toEqual([]);
}

/** The dialog Radix opens, once its entrance animation has settled. */
async function openDialog(page: Page, name: string) {
  const dialog = page.getByRole("dialog", { name });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(250);
  return dialog;
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`in the ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => {
        window.localStorage.setItem("theme", value);
      }, theme);
    });

    test("the sign-in and sign-up pages", async ({ browser }) => {
      // Signed out: a context without the session cookie.
      const context = await browser.newContext();
      await context.addInitScript((value) => {
        window.localStorage.setItem("theme", value);
      }, theme);
      const page = await context.newPage();
      await page.goto("/login");
      await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
      await audit(page);
      await page.goto("/signup");
      await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
      await audit(page);
      await context.close();
    });

    test("the library, its trash and its dialogs", async ({ page, account }) => {
      await createDocument(account.id, { markdown: "# Informe final" });
      await createDocument(account.id, { markdown: "# Apuntes" });
      await page.goto("/documents");
      await expect(page.getByRole("link", { name: "Informe final" })).toBeVisible();
      await audit(page);

      await page.getByRole("button", { name: "Nueva carpeta" }).click();
      await openDialog(page, "Nueva carpeta");
      await audit(page, DIALOG);
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Acciones de «Apuntes»" }).click();
      await page
        .getByRole("menuitem", { name: "Mover a la papelera", exact: true })
        .click();
      await page
        .getByRole("navigation", { name: "Carpetas" })
        .getByRole("button", { name: /^Papelera/ })
        .click();
      await expect(page.getByRole("list", { name: "Papelera" })).toBeVisible();
      await audit(page);
    });

    test("the workspace and its panels", async ({ page, openDocument }) => {
      await openDocument();
      await expect(page.getByRole("textbox", { name: "Editor Markdown" })).toBeVisible();
      await expect(page.getByRole("article", { name: "Documento" })).toBeVisible();
      await audit(page);

      for (const [button, dialog] of [
        ["Diseño del documento", "Diseño del documento"],
        ["Referencias del documento", "Referencias"],
        ["Historial de versiones", "Historial de versiones"],
      ] as const) {
        await page.getByRole("button", { name: button }).click();
        await openDialog(page, dialog);
        await audit(page, DIALOG);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog", { name: dialog })).toBeHidden();
      }
    });

    test("the command palette, the shortcuts and the first steps", async ({
      page,
      openDocument,
    }) => {
      await openDocument();
      await expect(page.getByRole("textbox", { name: "Editor Markdown" })).toBeVisible();

      await page.keyboard.press("ControlOrMeta+p");
      await openDialog(page, "Acciones");
      await audit(page, DIALOG);
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Ajustes de vista" }).click();
      await page.getByRole("menuitem", { name: "Atajos de teclado" }).click();
      await openDialog(page, "Atajos de teclado");
      await audit(page, DIALOG);
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: /^Primeros pasos:/ }).click();
      await expect(page.getByRole("button", { name: "Ocultar la guía" })).toBeVisible();
      await page.waitForTimeout(250);
      await audit(page);
    });
  });
}
