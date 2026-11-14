import { createDocument, createFolder } from "./support/database";
import { expect, test } from "./support/fixtures";

test("shows the folders as a row of chips and fits the screen", async ({
  page,
  account,
}) => {
  const folder = await createFolder(account.id, "Clases");
  await createDocument(account.id, { markdown: "# Tema 1", folderId: folder });
  await createDocument(account.id, { markdown: "# Suelto" });
  await page.goto("/documents");

  await page.getByRole("button", { name: "Clases, 1 documento" }).click();
  await expect(page.getByRole("main").getByRole("link")).toHaveText(["Tema 1"]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
