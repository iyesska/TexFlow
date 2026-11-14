import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

import { BLOCK_TEMPLATES } from "./commands";

type SyntaxContext = "math" | "code" | "text";

const MATH_NODES = new Set(["InlineMath", "BlockMath"]);
const CODE_NODES = new Set(["FencedCode", "CodeBlock", "InlineCode", "CodeText"]);

function syntaxContextAt(state: EditorState, pos: number): SyntaxContext {
  for (let node = syntaxTree(state).resolveInner(pos, -1).node; ;) {
    if (MATH_NODES.has(node.name)) return "math";
    if (CODE_NODES.has(node.name)) return "code";
    if (!node.parent) return "text";
    node = node.parent;
  }
}

const slash = (label: string, detail: string, template: string): Completion =>
  snippetCompletion(template, { label: `/${label}`, detail, type: "keyword" });

/** Quick insertions, offered after typing "/" at the start of a line or after a space. */
const SLASH_COMPLETIONS: readonly Completion[] = [
  slash("h1", "Título", "# ${Título}"),
  slash("h2", "Sección", "## ${Sección}"),
  slash("h3", "Subsección", "### ${Subsección}"),
  slash("lista", "Lista", "- ${Elemento}"),
  slash("numerada", "Lista numerada", "1. ${Elemento}"),
  slash("tareas", "Lista de tareas", "- [ ] ${Tarea}"),
  slash("cita", "Cita", "> ${Cita}"),
  slash("tabla", "Tabla", BLOCK_TEMPLATES.table),
  slash("codigo", "Bloque de código", BLOCK_TEMPLATES.codeBlock),
  slash("formula", "Fórmula en bloque", BLOCK_TEMPLATES.mathBlock),
  slash("imagen", "Imagen", BLOCK_TEMPLATES.image),
  slash("enlace", "Enlace", "[${texto}](${https://})"),
  slash("nota", "Nota al pie", BLOCK_TEMPLATES.footnote),
  // The empty field leaves the cursor after "@", where the keys are offered.
  slash("citar", "Cita de una referencia", "[@${}]"),
  slash("separador", "Línea horizontal", "---\n"),
];

export function slashCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\/[\p{L}\d]*/u);
  if (!word) return null;
  const before = context.state.sliceDoc(word.from - 1, word.from);
  if (before !== "" && !/\s/.test(before)) return null;
  if (syntaxContextAt(context.state, word.from) !== "text") return null;
  return { from: word.from, options: SLASH_COMPLETIONS, validFor: /^\/[\p{L}\d]*$/u };
}

const command = (name: string, detail?: string): Completion => ({
  label: `\\${name}`,
  type: "function",
  ...(detail ? { detail } : {}),
});

const template = (name: string, body: string, detail: string): Completion =>
  snippetCompletion(`\\${name}${body}`, {
    label: `\\${name}`,
    detail,
    type: "function",
  });

const GREEK = [
  "alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu",
  "xi pi rho sigma tau upsilon phi varphi chi psi omega",
  "Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega",
].flatMap((row) => row.split(" "));

const SYMBOLS = [
  "infty partial nabla cdot times div pm mp leq geq neq approx equiv sim propto",
  "in notin subset subseteq cup cap emptyset forall exists neg land lor",
  "to rightarrow leftarrow Rightarrow Leftrightarrow mapsto ldots cdots vdots ddots",
  "sin cos tan arcsin arccos arctan log ln exp max min det quad qquad",
].flatMap((row) => row.split(" "));

/** Common TeX commands. Those with arguments expand to a template with fields. */
const TEX_COMPLETIONS: readonly Completion[] = [
  template("frac", "{${numerador}}{${denominador}}", "Fracción"),
  template("sqrt", "{${x}}", "Raíz"),
  template("sum", "_{${i=1}}^{${n}}", "Sumatorio"),
  template("prod", "_{${i=1}}^{${n}}", "Productorio"),
  template("int", "_{${a}}^{${b}}", "Integral"),
  template("lim", "_{${x \\to 0}}", "Límite"),
  template("binom", "{${n}}{${k}}", "Binomial"),
  template("begin", "{${entorno}}\n\t${}\n\\end{${entorno}}", "Entorno"),
  template("left", "( ${} \\right)", "Paréntesis ajustables"),
  template("text", "{${texto}}", "Texto"),
  template("mathbb", "{${R}}", "Negrita de pizarra"),
  template("mathcal", "{${L}}", "Caligráfica"),
  template("mathbf", "{${x}}", "Negrita"),
  template("mathrm", "{${d}}", "Redonda"),
  template("vec", "{${v}}", "Vector"),
  template("hat", "{${x}}", "Circunflejo"),
  template("bar", "{${x}}", "Barra"),
  template("overline", "{${x}}", "Línea superior"),
  ...GREEK.map((name) => command(name)),
  ...SYMBOLS.map((name) => command(name)),
];

/** TeX commands, offered after a backslash anywhere except inside code. */
export function texCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\\[a-zA-Z]*/);
  if (!word) return null;
  if (word.to - word.from < 2 && !context.explicit) return null;
  if (syntaxContextAt(context.state, word.from) === "code") return null;
  return { from: word.from, options: TEX_COMPLETIONS, validFor: /^\\[a-zA-Z]*$/ };
}

/** A reference the text can cite, as the completion list shows it. */
export interface CitationOption {
  readonly key: string;
  /** "Pérez y Gómez (2020)" */
  readonly label: string;
  readonly title: string;
}

/**
 * Completes citation keys after "@" (or "-@"), from the document's references. An
 * e-mail address is left alone, as Pandoc leaves it.
 */
export function citationCompletions(references: () => readonly CitationOption[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/-?@[\p{L}\p{N}_:.#$%&\-+?<>~/]*/u);
    if (!word) return null;
    const before = context.state.sliceDoc(word.from - 1, word.from);
    if (before && /[\p{L}\p{N}_.@]/u.test(before)) return null;
    if (syntaxContextAt(context.state, word.from) !== "text") return null;
    const options = references().map(({ key, label, title }): Completion => ({
      label: `@${key}`,
      detail: label,
      info: title,
      type: "variable",
    }));
    if (options.length === 0) return null;
    const at = word.text.startsWith("-") ? word.from + 1 : word.from;
    return { from: at, options, validFor: /^@[\p{L}\p{N}_:.#$%&\-+?<>~/]*$/u };
  };
}
