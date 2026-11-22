import katex from "katex";
import "katex/dist/katex.min.css";

import { previewStyle } from "@/features/templates/model/preview-style";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

const FORMULA = String.raw`\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}`;

// Rendered once, when the page is built: the formula never changes.
const formula = katex.renderToString(FORMULA, { displayMode: true, output: "html" });

/** The Markdown behind the sheet, coloured as the editor colours it. */
function SourceCard() {
  return (
    <div className="absolute -bottom-10 -left-14 w-[19rem] rounded-xl border border-border-strong bg-surface-raised p-4 font-mono text-[0.75rem] leading-[1.65] text-muted-foreground shadow-overlay">
      <p>
        <span className="tok-markup"># </span>
        <span className="tok-heading">Introducción</span>
      </p>
      <p className="mt-[1.65em] truncate">En 1734, Euler encontró el valor…</p>
      <p className="tok-math mt-[1.65em]">$$</p>
      <p className="tok-math">{FORMULA}</p>
      <p className="tok-math">$$</p>
    </div>
  );
}

/**
 * What TexFlow makes, shown beside the sign-in form: the start of a typeset article
 * and the Markdown it comes from. Decorative.
 */
export function SampleSheet() {
  return (
    <div aria-hidden className="relative select-none">
      <div
        className="tf-document w-[27rem] rounded-[3px] bg-paper [mask-image:linear-gradient(to_bottom,black_70%,transparent)] px-14 pt-14 pb-10 shadow-paper"
        style={{ ...previewStyle(DEFAULT_SETTINGS), height: "33rem", overflow: "hidden" }}
      >
        <div className="title-block">
          <p className="title">Sobre la suma de los inversos de los cuadrados</p>
          <p className="author">Ada Martín</p>
        </div>
        <h1>
          <span className="header-section-number">1</span>Introducción
        </h1>
        <p>
          En 1734, Euler encontró el valor exacto de la serie de los inversos de los
          cuadrados, una pregunta que llevaba casi un siglo abierta:
        </p>
        {/* aislop-ignore-next-line security/dangerously-set-innerhtml -- KaTeX output for the constant FORMULA above, rendered at build time */}
        <div className="math display" dangerouslySetInnerHTML={{ __html: formula }} />
        <p>
          Su argumento trata el seno como un polinomio de grado infinito y compara los
          coeficientes de su desarrollo en serie con los de su producto de factores. Este
          artículo lo recorre paso a paso y lo compara con una demostración moderna basada
          en las series de Fourier.
        </p>
      </div>
      <SourceCard />
    </div>
  );
}
