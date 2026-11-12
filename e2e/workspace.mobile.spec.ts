import { expect, test } from "@playwright/test";

test("shows one pane at a time and switches between them", async ({ page }) => {
  await page.goto("/");
  const panes = page.getByRole("main").getByRole("region");
  await expect(panes).toHaveCount(1);
  await expect(panes.getByRole("heading", { name: "Markdown", level: 2 })).toBeVisible();

  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(panes).toHaveCount(1);
  await expect(
    panes.getByRole("heading", { name: "Vista previa", level: 2 }),
  ).toBeVisible();
});

test("fits the viewport without horizontal scrolling", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
