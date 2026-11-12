import { expect, test, type Page } from "@playwright/test";

// Panes live in <main>; the toast area is a region too, outside it.
const panes = (page: Page) => page.getByRole("main").getByRole("region");
const pane = (page: Page, name: string) =>
  panes(page).filter({ has: page.getByRole("heading", { name }) });
const switcher = (page: Page, name: string) =>
  page.getByRole("group", { name: "Paneles" }).getByRole("button", { name });

async function paneOrder(page: Page): Promise<string[]> {
  return panes(page).evaluateAll((regions) =>
    regions
      .map((region) => ({
        name: region.querySelector("h2")?.textContent ?? "",
        left: region.getBoundingClientRect().left,
      }))
      .sort((a, b) => a.left - b.left)
      .map((region) => region.name),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The workspace saves its layout once it is interactive; keyboard tests need that.
  await page.waitForFunction(() => document.cookie.includes("texflow_layout="));
});

test("shows the three panes side by side", async ({ page }) => {
  await expect(page).toHaveTitle(/TexFlow/);
  await expect.poll(() => paneOrder(page)).toEqual(["Markdown", "LaTeX", "Vista previa"]);
});

test("hides a pane from the switcher and remembers it after a reload", async ({
  page,
}) => {
  await switcher(page, "LaTeX").click();
  await expect(pane(page, "LaTeX")).toBeHidden();
  await expect(switcher(page, "LaTeX")).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(pane(page, "Markdown")).toBeVisible();
  await expect(pane(page, "LaTeX")).toBeHidden();
});

test("toggles panes with the keyboard", async ({ page }) => {
  await page.keyboard.press("Alt+Digit3");
  await expect(pane(page, "Vista previa")).toBeHidden();

  await page.keyboard.press("Alt+Digit1");
  await expect(pane(page, "Markdown")).toBeHidden();

  await page.keyboard.press("Alt+Digit0");
  await expect.poll(() => paneOrder(page)).toEqual(["Markdown", "LaTeX", "Vista previa"]);
});

test("never hides the last pane", async ({ page }) => {
  await page.getByRole("button", { name: "Opciones del panel Markdown" }).click();
  await page.getByRole("menuitem", { name: "Ver solo este panel" }).click();
  await expect(pane(page, "LaTeX")).toBeHidden();

  await switcher(page, "Markdown").click();
  await expect(pane(page, "Markdown")).toBeVisible();
});

test("reorders panes from the pane menu", async ({ page }) => {
  await page.getByRole("button", { name: "Opciones del panel Vista previa" }).click();
  await page.getByRole("menuitem", { name: "Mover a la izquierda" }).click();
  await expect.poll(() => paneOrder(page)).toEqual(["Markdown", "Vista previa", "LaTeX"]);

  await page.reload();
  await expect.poll(() => paneOrder(page)).toEqual(["Markdown", "Vista previa", "LaTeX"]);
});

test("resizes panes by dragging the handle between them", async ({ page }) => {
  const markdown = pane(page, "Markdown");
  const before = (await markdown.boundingBox())!;
  const handle = (await page.getByRole("separator").first().boundingBox())!;

  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 160, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();

  const after = (await markdown.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width + 120);

  await page.reload();
  const reloaded = (await pane(page, "Markdown").boundingBox())!;
  expect(Math.abs(reloaded.width - after.width)).toBeLessThan(4);
});

test("switches to the light theme and keeps it", async ({ page }) => {
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Ajustes de vista" }).click();
  await page.getByRole("menuitemradio", { name: "Claro" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
});

test("restores the default layout", async ({ page }) => {
  await switcher(page, "Vista previa").click();
  await page.getByRole("button", { name: "Ajustes de vista" }).click();
  await page.getByRole("menuitem", { name: "Restablecer diseño" }).click();

  await expect(page.getByText("Diseño restablecido")).toBeVisible();
  await expect.poll(() => paneOrder(page)).toEqual(["Markdown", "LaTeX", "Vista previa"]);
});
