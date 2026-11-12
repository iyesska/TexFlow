import { Tag, tags as t } from "@lezer/highlight";
import type { BlockContext, InlineContext, Line, MarkdownConfig } from "@lezer/markdown";

/** Highlighting tag for TeX math, so it can be coloured apart from code. */
export const mathTag = Tag.define();

const DOLLAR = 36;
const BACKSLASH = 92;
const NEWLINE = 10;

const isSpace = (code: number) => code === 32 || code === 9 || code === NEWLINE;
const isDigit = (code: number) => code >= 48 && code <= 57;

/** Position of the next unescaped `$` run of `length` at or after `from`, or -1. */
function findClosing(cx: InlineContext, from: number, length: number): number {
  for (let pos = from; pos < cx.end; pos++) {
    const code = cx.char(pos);
    if (code === BACKSLASH) {
      pos++;
      continue;
    }
    if (code !== DOLLAR) continue;
    if (length === 1) return pos;
    if (cx.char(pos + 1) === DOLLAR) return pos;
  }
  return -1;
}

function parseDisplayMath(cx: InlineContext, pos: number): number {
  const close = findClosing(cx, pos + 2, 2);
  if (close === -1) return -1;
  return cx.addElement(
    cx.elt("BlockMath", pos, close + 2, [
      cx.elt("MathMark", pos, pos + 2),
      cx.elt("MathMark", close, close + 2),
    ]),
  );
}

/**
 * Inline math follows Pandoc's rules: the opening `$` is followed by a non-space, the
 * closing `$` is preceded by a non-space and not followed by a digit. That keeps
 * prices such as "$5 and $10" as plain text.
 */
function parseInlineMath(cx: InlineContext, pos: number): number {
  if (isSpace(cx.char(pos + 1)) || pos + 1 >= cx.end) return -1;
  const close = findClosing(cx, pos + 1, 1);
  if (close === -1 || close === pos + 1) return -1;
  if (isSpace(cx.char(close - 1)) || isDigit(cx.char(close + 1))) return -1;
  // A line break inside "$...$" means the dollars were not a formula.
  if (cx.slice(pos, close).includes("\n\n")) return -1;
  return cx.addElement(
    cx.elt("InlineMath", pos, close + 1, [
      cx.elt("MathMark", pos, pos + 1),
      cx.elt("MathMark", close, close + 1),
    ]),
  );
}

/** A `$$` block that spans lines, including blank ones a paragraph could not hold. */
function parseMathBlock(cx: BlockContext, line: Line): boolean {
  const rest = line.text.slice(line.pos);
  if (!rest.startsWith("$$")) return false;
  // "$$ x $$" on a single line is handled by the inline parser.
  if (rest.indexOf("$$", 2) !== -1) return false;

  const start = cx.lineStart + line.pos;
  const marks = [cx.elt("MathMark", start, start + 2)];
  let end = cx.lineStart + line.text.length;
  while (cx.nextLine()) {
    const close = line.text.indexOf("$$");
    end = cx.lineStart + line.text.length;
    if (close !== -1) {
      marks.push(cx.elt("MathMark", cx.lineStart + close, cx.lineStart + close + 2));
      cx.nextLine();
      break;
    }
  }
  cx.addElement(cx.elt("BlockMath", start, end, marks));
  return true;
}

/** Pandoc footnote references and definition labels: `[^note]`. */
function parseFootnoteRef(cx: InlineContext, pos: number): number {
  if (cx.char(pos + 1) !== 94 /* ^ */) return -1;
  const label = /^\[\^[^\s\]]+\]/.exec(cx.slice(pos, Math.min(cx.end, pos + 80)));
  if (!label) return -1;
  return cx.addElement(cx.elt("FootnoteRef", pos, pos + label[0].length));
}

/** Markdown syntax that Pandoc understands and CommonMark does not. */
export const pandocSyntax: MarkdownConfig = {
  defineNodes: [
    { name: "InlineMath", style: mathTag },
    { name: "BlockMath", block: true, style: mathTag },
    { name: "MathMark", style: t.processingInstruction },
    { name: "FootnoteRef", style: t.link },
  ],
  parseInline: [
    {
      name: "Math",
      before: "Emphasis",
      parse(cx, next, pos) {
        if (next !== DOLLAR) return -1;
        return cx.char(pos + 1) === DOLLAR
          ? parseDisplayMath(cx, pos)
          : parseInlineMath(cx, pos);
      },
    },
    {
      name: "FootnoteRef",
      before: "Link",
      parse(cx, next, pos) {
        return next === 91 /* [ */ ? parseFootnoteRef(cx, pos) : -1;
      },
    },
  ],
  parseBlock: [{ name: "MathBlock", before: "FencedCode", parse: parseMathBlock }],
};
