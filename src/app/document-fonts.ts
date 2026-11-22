import localFont from "next/font/local";

/**
 * The faces the LaTeX engine uses, so the quick preview reads like the PDF. None is
 * preloaded: a browser only downloads the family the document's template uses.
 * Libertinus, shared with the wordmark, is declared in the root layout.
 *
 * next/font needs every argument written out literally, hence the repetition.
 */

const latinModern = localFont({
  src: [
    { path: "./fonts/document/lmroman10-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/document/lmroman10-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/document/lmroman10-bold.woff2", weight: "700", style: "normal" },
    {
      path: "./fonts/document/lmroman10-bolditalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-tf-latin-modern",
  display: "swap",
  preload: false,
});

const pagella = localFont({
  src: [
    {
      path: "./fonts/document/texgyrepagella-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/document/texgyrepagella-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/document/texgyrepagella-bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/document/texgyrepagella-bolditalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-tf-pagella",
  display: "swap",
  preload: false,
});

const termes = localFont({
  src: [
    {
      path: "./fonts/document/texgyretermes-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/document/texgyretermes-italic.woff2",
      weight: "400",
      style: "italic",
    },
    { path: "./fonts/document/texgyretermes-bold.woff2", weight: "700", style: "normal" },
    {
      path: "./fonts/document/texgyretermes-bolditalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-tf-termes",
  display: "swap",
  preload: false,
});

const heros = localFont({
  src: [
    {
      path: "./fonts/document/texgyreheros-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/document/texgyreheros-italic.woff2",
      weight: "400",
      style: "italic",
    },
    { path: "./fonts/document/texgyreheros-bold.woff2", weight: "700", style: "normal" },
    {
      path: "./fonts/document/texgyreheros-bolditalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-tf-heros",
  display: "swap",
  preload: false,
});

/** Class names that define the --font-tf-* variables; set them on <html>. */
export const documentFontVariables = [
  latinModern.variable,
  pagella.variable,
  termes.variable,
  heros.variable,
].join(" ");
