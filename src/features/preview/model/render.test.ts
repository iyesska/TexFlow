import { describe, expect, it, vi } from "vitest";

import { patchChildren } from "./patch-children";
import { resolveImages } from "./resolve-images";
import { sanitizePreviewHtml } from "./sanitize";
import { createCachedRenderer, typesetMath } from "./typeset-math";
import { effectiveScale, fitScale, zoomInFrom, zoomLabel, zoomOutFrom } from "./zoom";

/** Sanitizes `html` and returns the resulting markup. */
function clean(html: string): string {
  const host = document.createElement("div");
  host.append(sanitizePreviewHtml(html));
  return host.innerHTML;
}

const fragment = (html: string) => document.createRange().createContextualFragment(html);

describe("sanitizePreviewHtml", () => {
  it("keeps the markup Pandoc produces", () => {
    const html =
      '<h1 id="pv-intro">Intro</h1><p>Un <em>texto</em> con <code>código</code>.</p>' +
      '<table><thead><tr><th style="text-align: right">a</th></tr></thead></table>' +
      '<figure><img src="d.png" alt="Pie"><figcaption>Pie</figcaption></figure>';
    expect(clean(html)).toBe(html);
  });

  it.each([
    ["script elements", "<p>a</p><script>alert(1)</script>"],
    ["event handlers", '<p onclick="alert(1)">a</p><img src="x.png" onerror="alert(1)">'],
    ["javascript: links", '<a href="javascript:alert(1)">x</a>'],
    ["obfuscated javascript: links", '<a href="  JaVa\tScRiPt:alert(1)">x</a>'],
    ["data: URLs", '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
    [
      "iframes, objects and forms",
      "<iframe src='//evil'></iframe><object></object><form></form>",
    ],
    [
      "inline SVG and MathML",
      "<svg><script>alert(1)</script></svg><math><mi>x</mi></math>",
    ],
    ["style elements", "<style>body{display:none}</style>"],
  ])("removes %s", (_label, html) => {
    const output = clean(html);
    expect(output).not.toMatch(
      /script|onerror|onclick|javascript|data:|iframe|object|form|svg|style/i,
    );
  });

  it("keeps only alignment and percentage widths from inline styles", () => {
    expect(
      clean('<table><tr><td style="text-align: right;">a</td></tr></table>'),
    ).toContain('style="text-align: right"');
    expect(clean('<img src="a.png" style="position:fixed;width:50.0%">')).toBe(
      '<img src="a.png" style="width:50.0%">',
    );
    expect(clean('<span style="background:url(//evil/track)">a</span>')).toBe(
      "<span>a</span>",
    );
    expect(clean('<p style="width: 5000%">a</p>')).toBe("<p>a</p>");
  });

  it("drops ids outside the preview namespace", () => {
    expect(clean('<h1 id="workspace-split">a</h1>')).toBe("<h1>a</h1>");
    expect(clean('<h1 id="pv-a">a</h1>')).toBe('<h1 id="pv-a">a</h1>');
  });

  it("opens external links in a new tab without leaking the opener", () => {
    const output = clean('<a href="https://pandoc.org">x</a><a href="#pv-fn1">1</a>');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer nofollow"');
    expect(output).toContain('<a href="#pv-fn1">1</a>');
  });

  it("keeps task-list checkboxes, disabled, and no other input", () => {
    expect(clean('<input type="checkbox" checked="">')).toBe(
      '<input type="checkbox" checked="" disabled="">',
    );
    expect(clean('<input type="text" value="x"><input type="password">')).toBe("");
  });
});

describe("typesetMath", () => {
  /** A stand-in renderer that returns its arguments as text. */
  const asText = (tex: string, display: boolean) => {
    const result = document.createDocumentFragment();
    result.append(`${display ? "D" : "I"}:${tex}`);
    return result;
  };

  it("renders each formula from its text, inline or display", () => {
    const root = fragment(
      '<p><span class="math inline">a &lt; b</span></p><span class="math display">\nx^2\n</span>',
    );
    typesetMath(root, asText);
    expect(root.querySelector(".inline")?.textContent).toBe("I:a < b");
    expect(root.querySelector(".display")?.textContent).toBe("D:x^2");
  });

  it("never parses the formula's text as HTML", () => {
    const root = fragment(
      '<span class="math inline">&lt;img src=x onerror=alert(1)&gt;</span>',
    );
    typesetMath(root, asText);
    expect(root.querySelector("img")).toBeNull();
    expect(root.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("typesets a repeated formula once and hands out a fresh copy each time", () => {
    const render = vi.fn(asText);
    const cached = createCachedRenderer(render);
    const first = cached("x", false);
    const second = cached("x", false);
    cached("x", true);
    expect(render).toHaveBeenCalledTimes(2);
    expect(first).not.toBe(second);
    expect(second.textContent).toBe("I:x");
  });
});

describe("resolveImages", () => {
  const images = new Map([["diagrama.png", { url: "blob:app/1" }]]);

  it("points document images at their stored copy", () => {
    const root = fragment('<img src="diagrama.png" alt="a"><img src="./diagrama.png">');
    resolveImages(root, images);
    expect(
      [...root.querySelectorAll("img")].map((image) => image.getAttribute("src")),
    ).toEqual(["blob:app/1", "blob:app/1"]);
  });

  it("replaces missing and remote images with an explanation", () => {
    const root = fragment('<img src="otra.png"><img src="https://example.com/a.png">');
    resolveImages(root, images);
    expect(root.querySelectorAll("img")).toHaveLength(0);
    const notes = [...root.querySelectorAll(".missing-image")].map(
      (note) => note.textContent,
    );
    expect(notes[0]).toContain("Imagen no encontrada.");
    expect(notes[0]).toContain("otra.png");
    expect(notes[1]).toContain("Imagen remota");
  });

  it("shows the image path as text, never as markup", () => {
    const root = fragment("<img>");
    root.querySelector("img")?.setAttribute("src", "<b>x</b>.png");
    resolveImages(root, images);
    expect(root.querySelector(".missing-image b")).toBeNull();
  });
});

describe("patchChildren", () => {
  const container = (html: string) => {
    const element = document.createElement("div");
    element.innerHTML = html;
    return element;
  };

  it("keeps unchanged blocks and replaces only what differs", () => {
    const element = container("<p>uno</p><p>dos</p><p>tres</p>");
    const [first, , third] = Array.from(element.children);
    patchChildren(element, fragment("<p>uno</p><p>DOS</p><p>tres</p>"));
    expect(element.innerHTML).toBe("<p>uno</p><p>DOS</p><p>tres</p>");
    expect(element.children[0]).toBe(first);
    expect(element.children[2]).toBe(third);
  });

  it.each([
    ["", "<p>a</p>"],
    ["<p>a</p>", ""],
    ["<p>a</p><p>a</p>", "<p>a</p>"],
    ["<p>a</p>", "<p>a</p><p>a</p>"],
    ["<p>a</p><p>b</p>", "<p>b</p><p>a</p>"],
    ["<h1>t</h1><p>a</p>", "<h1>t</h1><p>nuevo</p><p>a</p>"],
  ])("turns %j into %j", (before, after) => {
    const element = container(before);
    patchChildren(element, fragment(after));
    expect(element.innerHTML).toBe(after);
  });
});

describe("zoom", () => {
  it("fits the sheet to the pane, within bounds", () => {
    expect(fitScale(794 + 40)).toBe(1);
    expect(fitScale(437)).toBeCloseTo(0.5);
    expect(fitScale(10)).toBe(0.25);
    expect(fitScale(10_000)).toBe(2);
    // A US-letter page (816 px) needs a smaller scale than A4 to fit the same pane.
    expect(fitScale(856, 816)).toBe(1);
    expect(fitScale(834, 816)).toBeLessThan(1);
  });

  it("steps from the current scale, fitted or fixed", () => {
    expect(zoomInFrom(0.73)).toBe(0.8);
    expect(zoomOutFrom(0.73)).toBe(0.67);
    expect(zoomInFrom(1)).toBe(1.25);
    expect(zoomOutFrom(1)).toBe(0.8);
    expect(zoomInFrom(2)).toBeUndefined();
    expect(zoomOutFrom(0.5)).toBeUndefined();
  });

  it("resolves and labels a setting", () => {
    expect(effectiveScale("fit", 834)).toBe(1);
    expect(effectiveScale(1.5, 834)).toBe(1.5);
    expect(zoomLabel(0.667)).toBe("67 %");
  });
});
