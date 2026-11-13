import "server-only";

import type { Diagnostic } from "@/contracts/compilation";

import { locateInMarkdown } from "./locate-in-markdown";

const MAX_WARNINGS = 20;
const MAX_EXCERPT_LENGTH = 160;

/** Lines Tectonic prints that tell the writer nothing. */
const NOISE = [
  /halted on potentially-recoverable error/i,
  /warnings were issued by the TeX engine/i,
  /^Fontconfig/i,
  /accessing absolute path/i,
  /Underfull \\[hv]box/,
];

interface Explanation {
  readonly message: string;
  /** Text to look for in the Markdown to find the line at fault. */
  readonly token?: string;
}

type Explain = (match: RegExpExecArray, context: string) => Explanation;

/** The last command on the line where TeX stopped: the one it did not understand. */
function lastCommand(context: string): string | undefined {
  return context.match(/\\[a-zA-Z@]+/g)?.at(-1);
}

const BALANCE = "Las llaves { } de una fórmula o de un comando no están equilibradas.";

/** Known LaTeX errors, explained for someone who has never read a TeX log. */
const ERRORS: readonly (readonly [RegExp, Explain])[] = [
  [
    /Undefined control sequence/,
    (_match, context) => {
      const command = lastCommand(context);
      return command
        ? {
            message: `LaTeX no conoce el comando ${command}. Revisa cómo está escrito.`,
            token: command,
          }
        : { message: "El documento usa un comando que LaTeX no conoce." };
    },
  ],
  [
    /Unable to load picture or PDF file '([^']+)'/,
    ([, file = ""]) => ({
      message: `No se encontró la imagen «${file}». Añádela al documento desde el editor.`,
      token: file,
    }),
  ],
  [
    /File `([^']+)\.(sty|cls)' not found/,
    ([, name = ""]) => ({
      message: `El paquete LaTeX «${name}» no está disponible en este servidor.`,
      token: name,
    }),
  ],
  [
    /File `([^']+\.(?:clo|cfg|def|fd|ldf|ini|tfm|otf|ttf))' not found/,
    ([, file = ""]) => ({
      message: `Falta «${file}», un archivo del propio LaTeX, en este servidor. Quien lo administra puede instalarlo con scripts/setup-tectonic.sh.`,
    }),
  ],
  [
    /File `([^']+)' not found/,
    ([, file = ""]) => ({
      message: `No se encontró el archivo «${file}». Un documento solo puede usar sus propias imágenes.`,
    }),
  ],
  [
    /File ended while scanning use of (\\[a-zA-Z@]+)/,
    ([, command = ""]) => ({
      message: `A ${command} le falta una llave de cierre «}».`,
      token: command,
    }),
  ],
  [
    /Paragraph ended before (\\[a-zA-Z@]+) was complete/,
    ([, command = ""]) => ({
      message: `A ${command} le falta una llave de cierre «}» antes del final del párrafo.`,
      token: command,
    }),
  ],
  [
    /Missing \$ inserted/,
    () => ({
      message:
        "Hay un símbolo matemático (como _ o ^) fuera de una fórmula, o una fórmula sin cerrar.",
    }),
  ],
  [
    /Missing [{}] inserted|Extra \}, or forgotten \$|Too many \}'s/,
    () => ({ message: BALANCE }),
  ],
  [
    /Misplaced alignment tab character &/,
    () => ({
      message:
        "Hay un «&» suelto. Dentro de una fórmula solo se usa en tablas y matrices.",
    }),
  ],
  [
    /Double (superscript|subscript)/,
    ([, kind]) => ({
      message: `Una fórmula tiene dos ${kind === "superscript" ? "superíndices" : "subíndices"} seguidos. Agrúpalos con llaves.`,
    }),
  ],
  [
    /Environment (\S+) undefined/,
    ([, name = ""]) => ({
      message: `LaTeX no conoce el entorno «${name}».`,
      token: `{${name}}`,
    }),
  ],
  [
    /\\begin\{([^}]+)\}.* ended by \\end\{([^}]+)\}/,
    ([, opened = "", closed = ""]) => ({
      message: `El entorno «${opened}» se cierra con \\end{${closed}}.`,
      token: `\\end{${closed}}`,
    }),
  ],
  [
    /TeX capacity exceeded/,
    () => ({
      message:
        "El documento agotó la memoria de LaTeX, a menudo por un comando que se llama a sí mismo.",
    }),
  ],
];

const WARNINGS: readonly (readonly [RegExp, (match: RegExpExecArray) => string])[] = [
  [
    /Overfull \\hbox \(([\d.]+)pt too wide\)/,
    ([, amount = "0"]) =>
      `Una línea sobresale ${Math.round(Number(amount))} pt del margen derecho.`,
  ],
  [
    /Reference `([^']+)' .* undefined/,
    ([, name = ""]) => `La referencia «${name}» no existe.`,
  ],
  [
    /Citation `([^']+)' .* undefined/,
    ([, name = ""]) => `La cita «${name}» no está en la bibliografía.`,
  ],
];

const LINE = /^(error|warning): (?:[^\s:]+\.tex:(\d+): )?(.*)$/;

function clean(message: string): string {
  return message
    .replace(/^!\s*/, "")
    .replace(/^LaTeX (?:Error|Warning): /, "")
    .replace(/\.+$/, "")
    .trim();
}

/** The text TeX showed after "l.<line> ": the source up to the point where it stopped. */
function logContext(log: string, line: number | undefined): string {
  if (line === undefined) return "";
  const prefix = `l.${line} `;
  const found = log.split("\n").find((entry) => entry.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function explainError(detail: string, context: string): Explanation {
  for (const [pattern, explain] of ERRORS) {
    const match = pattern.exec(detail);
    if (match) return explain(match, context);
  }
  return { message: "LaTeX no pudo componer el documento." };
}

function explainWarning(detail: string): string {
  for (const [pattern, explain] of WARNINGS) {
    const match = pattern.exec(detail);
    if (match) return explain(match);
  }
  return detail;
}

/**
 * Turns the LaTeX engine's output into diagnostics a writer can act on: a plain
 * explanation, the engine's words, and where the problem is.
 *
 * @param stderr What Tectonic printed.
 * @param log The TeX log, for the context around an error.
 * @param latex The source that was compiled, for excerpts.
 * @param markdown The document, to trace problems back to it.
 */
export function parseDiagnostics(
  stderr: string,
  log: string,
  latex: string,
  markdown: string,
): Diagnostic[] {
  const latexLines = latex.split("\n");
  const seen = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  let warnings = 0;

  for (const entry of stderr.split("\n")) {
    const match = LINE.exec(entry.trim());
    if (!match || NOISE.some((pattern) => pattern.test(entry))) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);

    const severity = match[1] === "error" ? "error" : "warning";
    const latexLine = match[2] ? Number(match[2]) : undefined;
    const detail = clean(match[3] ?? "");
    if (detail === "") continue;
    if (severity === "warning" && ++warnings > MAX_WARNINGS) continue;

    const source = latexLine ? latexLines[latexLine - 1]?.trim() : undefined;
    const explanation: Explanation =
      severity === "error"
        ? explainError(detail, logContext(log, latexLine))
        : { message: explainWarning(detail) };
    const markdownLine =
      severity === "error"
        ? locateInMarkdown(markdown, explanation.token, source)
        : undefined;

    diagnostics.push({
      severity,
      message: explanation.message,
      ...(detail !== explanation.message ? { detail } : {}),
      ...(latexLine ? { latexLine } : {}),
      ...(markdownLine ? { markdownLine } : {}),
      ...(source ? { excerpt: source.slice(0, MAX_EXCERPT_LENGTH) } : {}),
    });
  }
  return diagnostics;
}
