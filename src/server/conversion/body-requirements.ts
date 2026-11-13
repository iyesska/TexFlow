import "server-only";

interface Requirement {
  /** Present in the body when the requirement applies. */
  readonly marker: string;
  /** The preamble line that satisfies it. */
  readonly preamble: string;
}

const REQUIREMENTS: readonly Requirement[] = [
  { marker: "\\begin{longtable}", preamble: "\\usepackage{longtable,booktabs,array}" },
  { marker: "\\includegraphics", preamble: "\\usepackage{graphicx}" },
  { marker: "\\href{", preamble: "\\usepackage{hyperref}" },
  { marker: "\\hypertarget{", preamble: "\\usepackage{hyperref}" },
  { marker: "\\sout{", preamble: "\\usepackage[normalem]{ulem}" },
  { marker: "\\(", preamble: "\\usepackage{amsmath,amssymb}" },
  { marker: "\\[", preamble: "\\usepackage{amsmath,amssymb}" },
  {
    marker: "\\tightlist",
    preamble:
      "\\providecommand{\\tightlist}{\\setlength{\\itemsep}{0pt}\\setlength{\\parskip}{0pt}}",
  },
];

/**
 * A body-only fragment is meant to be pasted into someone's own document. This heads
 * it with a comment listing the preamble lines that document needs, so it compiles.
 */
export function withPreambleNotes(body: string): string {
  const needed = [
    ...new Set(
      REQUIREMENTS.filter(({ marker }) => body.includes(marker)).map(
        ({ preamble }) => preamble,
      ),
    ),
  ];
  if (needed.length === 0) return body;
  const notes = [
    "% Este fragmento necesita estas líneas en el preámbulo de tu documento:",
    ...needed.map((line) => `%   ${line}`),
    "",
  ];
  return `${notes.join("\n")}\n${body}`;
}
