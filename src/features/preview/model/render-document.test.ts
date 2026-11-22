import { describe, expect, it } from "vitest";

import { renderDocument } from "./render-document";

const container = () => document.createElement("article");

describe("renderDocument", () => {
  it("typesets formulas with KaTeX", () => {
    const element = container();
    renderDocument(
      { body: element, cover: null },
      '<p><span class="math inline">x^2</span></p>',
      new Map(),
    );
    expect(element.querySelector(".katex")).not.toBeNull();
    expect(element.querySelector(".katex-mathml")?.textContent).toContain("x");
  });

  it("shows a broken formula in place instead of failing", () => {
    const element = container();
    renderDocument(
      { body: element, cover: null },
      '<p>antes <span class="math inline">\\frac{</span> después</p>',
      new Map(),
    );
    expect(element.querySelector(".katex-error")).not.toBeNull();
    expect(element.textContent).toContain("antes");
    expect(element.textContent).toContain("después");
  });

  it("keeps untrusted TeX commands inert", () => {
    const element = container();
    renderDocument(
      { body: element, cover: null },
      '<span class="math inline">\\href{javascript:alert(1)}{x} \\includegraphics{https://evil/a.png}</span>',
      new Map(),
    );
    expect(element.querySelector("a")).toBeNull();
    expect(element.querySelector("img")).toBeNull();
  });

  it("sanitizes, resolves images and patches in one pass", () => {
    const element = container();
    const images = new Map([["a.png", { url: "blob:app/1" }]]);
    renderDocument(
      { body: element, cover: null },
      '<p onclick="x()">uno</p><img src="a.png" alt="A">',
      images,
    );
    const paragraph = element.querySelector("p");
    expect(paragraph?.hasAttribute("onclick")).toBe(false);
    expect(element.querySelector("img")?.getAttribute("src")).toBe("blob:app/1");

    renderDocument(
      { body: element, cover: null },
      '<p>uno</p><img src="a.png" alt="A"><p>dos</p>',
      images,
    );
    expect(element.querySelector("p")).toBe(paragraph);
    expect(element.children).toHaveLength(3);
  });

  it("moves the title block to its own sheet when there is a cover page", () => {
    const body = container();
    const cover = container();
    const html =
      '<header class="title-block"><h1 class="title">Tesis</h1></header><p>Texto.</p>';
    renderDocument({ body, cover }, html, new Map());
    expect(cover.querySelector(".title")?.textContent).toBe("Tesis");
    expect(body.querySelector(".title-block")).toBeNull();
    expect(body.textContent).toBe("Texto.");
  });

  it("leaves the cover empty for a document without a title", () => {
    const body = container();
    const cover = container();
    renderDocument({ body, cover }, "<p>Sin título.</p>", new Map());
    expect(cover.childNodes).toHaveLength(0);
    expect(body.textContent).toBe("Sin título.");
  });

  it("sets a table's caption above it, across the text, not inside the table", () => {
    const body = container();
    renderDocument(
      { body, cover: null },
      "<table><caption>Datos <em>medidos</em></caption><tbody><tr><td>1</td></tr></tbody></table>",
      new Map(),
    );
    const [caption, table] = Array.from(body.children);
    expect(caption?.matches("p.tf-table-caption")).toBe(true);
    expect(caption?.innerHTML).toBe("Datos <em>medidos</em>");
    expect(table?.tagName).toBe("TABLE");
    expect(table?.querySelector("caption")).toBeNull();
  });
});
