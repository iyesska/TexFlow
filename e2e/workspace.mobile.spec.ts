import { expect, test } from "./support/fixtures";

test("shows one pane at a time and switches between them", async ({
  page,
  openDocument,
}) => {
  await openDocument();
  const panes = page.getByRole("main").getByRole("region");
  await expect(panes).toHaveCount(1);
  await expect(panes.getByRole("heading", { name: "Markdown", level: 2 })).toBeVisible();

  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(panes).toHaveCount(1);
  await expect(
    panes.getByRole("heading", { name: "Vista previa", level: 2 }),
  ).toBeVisible();
});

test("fits the viewport without horizontal scrolling", async ({ page, openDocument }) => {
  await openDocument();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("keeps the title in view, with the document's panels in the view menu", async ({
  page,
  openDocument,
}) => {
  await openDocument({ markdown: "# Cuaderno de campo\n\nNotas." });
  await expect(page.getByRole("button", { name: "Cuaderno de campo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Historial de versiones" })).toBeHidden();

  await page.getByRole("button", { name: "Ajustes de vista" }).click();
  await page.getByRole("menuitem", { name: "Historial de versiones" }).click();
  await expect(
    page.getByRole("dialog", { name: "Historial de versiones" }),
  ).toBeVisible();
});
