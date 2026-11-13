import { describe, expect, it } from "vitest";

import { renderDocument } from "./render-document";

const container = () => document.createElement("article");

describe("renderDocument", () => {
  it("typesets formulas with KaTeX", () => {
    const element = container();
    renderDocument(element, '<p><span class="math inline">x^2</span></p>', new Map());
    expect(element.querySelector(".katex")).not.toBeNull();
    expect(element.querySelector(".katex-mathml")?.textContent).toContain("x");
  });

  it("shows a broken formula in place instead of failing", () => {
    const element = container();
    renderDocument(
      element,
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
      element,
      '<span class="math inline">\\href{javascript:alert(1)}{x} \\includegraphics{https://evil/a.png}</span>',
      new Map(),
    );
    expect(element.querySelector("a")).toBeNull();
    expect(element.querySelector("img")).toBeNull();
  });

  it("sanitizes, resolves images and patches in one pass", () => {
    const element = container();
    const images = new Map([["a.png", { url: "blob:app/1" }]]);
    renderDocument(element, '<p onclick="x()">uno</p><img src="a.png" alt="A">', images);
    const paragraph = element.querySelector("p");
    expect(paragraph?.hasAttribute("onclick")).toBe(false);
    expect(element.querySelector("img")?.getAttribute("src")).toBe("blob:app/1");

    renderDocument(element, '<p>uno</p><img src="a.png" alt="A"><p>dos</p>', images);
    expect(element.querySelector("p")).toBe(paragraph);
    expect(element.children).toHaveLength(3);
  });
});
