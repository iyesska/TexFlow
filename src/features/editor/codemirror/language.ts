import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";
import { classHighlighter, tagHighlighter, tags as t } from "@lezer/highlight";

import { citationTag, mathTag, pandocSyntax } from "./math";

/** Classes for the Markdown-specific tags the stock class highlighter leaves out. */
const markdownHighlighter = tagHighlighter([
  { tag: mathTag, class: "tok-math" },
  { tag: citationTag, class: "tok-citation" },
  { tag: t.processingInstruction, class: "tok-markup" },
  { tag: t.contentSeparator, class: "tok-markup" },
  { tag: t.monospace, class: "tok-code" },
  { tag: t.quote, class: "tok-quote" },
  { tag: t.strikethrough, class: "tok-strike" },
]);

/**
 * Markdown as Pandoc reads it: GitHub-flavoured tables and task lists, TeX math and
 * footnotes, with fenced code highlighted in its own language (loaded on demand).
 */
export function markdownSupport(): Extension {
  return [
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
      extensions: [pandocSyntax],
      // The editor ships its own completions; HTML tag completion is noise here.
      completeHTMLTags: false,
    }),
    syntaxHighlighting(classHighlighter),
    syntaxHighlighting(markdownHighlighter),
  ];
}
