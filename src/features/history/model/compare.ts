import { diffArrays, diffWordsWithSpace } from "diff";

/**
 * Compares two states of a document the way the history shows them: line by line,
 * with the words that changed marked inside a changed line, and long runs of
 * unchanged lines folded away.
 */

export interface Segment {
  readonly text: string;
  /** Whether this part of the line is what changed in it. */
  readonly changed: boolean;
}

export type LineKind = "same" | "removed" | "added";

export interface DiffLine {
  readonly kind: LineKind;
  /** The line's number in the earlier text; null for an added line. */
  readonly before: number | null;
  /** The line's number in the later text; null for a removed line. */
  readonly after: number | null;
  readonly segments: readonly Segment[];
}

export type DiffBlock =
  | { readonly kind: "lines"; readonly lines: readonly DiffLine[] }
  /** Unchanged lines far from any change, folded away until asked for. */
  | { readonly kind: "folded"; readonly lines: readonly DiffLine[] };

export type Comparison =
  | {
      readonly ok: true;
      /** Empty when the texts are the same. */
      readonly blocks: readonly DiffBlock[];
      readonly added: number;
      readonly removed: number;
    }
  /** The texts were too long, or too different, to compare in time. */
  | { readonly ok: false };

/** Unchanged lines shown on each side of a change. */
const CONTEXT_LINES = 3;
/** A shorter run of unchanged lines is shown rather than folded. */
const MIN_FOLDED_LINES = 4;
const TIMEOUT_MS = 1_000;
/** Below this share of unchanged text, two lines are shown as replaced whole. */
const MIN_SIMILARITY = 0.4;
/** Words are compared only inside lines up to this long. */
const MAX_WORD_DIFF_LENGTH = 5_000;

function linesOf(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  // A final newline ends the last line; it does not start another.
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

const whole = (text: string): readonly Segment[] => [{ text, changed: false }];

function joined(segments: Segment[]): Segment[] {
  const result: Segment[] = [];
  for (const segment of segments) {
    const last = result.at(-1);
    if (last && last.changed === segment.changed) {
      result[result.length - 1] = {
        text: last.text + segment.text,
        changed: last.changed,
      };
    } else {
      result.push(segment);
    }
  }
  return result;
}

/**
 * Marks the words that differ between a removed line and the line that replaced it,
 * or null when the two have too little in common for that to help.
 */
function wordSegments(
  removed: string,
  added: string,
): readonly [readonly Segment[], readonly Segment[]] | null {
  const longest = Math.max(removed.length, added.length);
  if (longest === 0 || longest > MAX_WORD_DIFF_LENGTH) return null;
  const changes = diffWordsWithSpace(removed, added, { timeout: 50 });
  if (!changes) return null;

  const before: Segment[] = [];
  const after: Segment[] = [];
  let unchanged = 0;
  for (const change of changes) {
    if (change.added) after.push({ text: change.value, changed: true });
    else if (change.removed) before.push({ text: change.value, changed: true });
    else {
      unchanged += change.value.length;
      before.push({ text: change.value, changed: false });
      after.push({ text: change.value, changed: false });
    }
  }
  if (unchanged / longest < MIN_SIMILARITY) return null;
  return [joined(before), joined(after)];
}

/** Hides unchanged lines further than a few lines from any change. */
function fold(lines: readonly DiffLine[]): DiffBlock[] {
  const near = Array.from({ length: lines.length }, () => false);
  lines.forEach((line, index) => {
    if (line.kind === "same") return;
    const last = Math.min(lines.length - 1, index + CONTEXT_LINES);
    for (let k = Math.max(0, index - CONTEXT_LINES); k <= last; k++) near[k] = true;
  });
  if (!near.includes(true)) return [];

  const runs: { shown: boolean; lines: DiffLine[] }[] = [];
  lines.forEach((line, index) => {
    const shown = near[index] ?? false;
    const run = runs.at(-1);
    if (run && run.shown === shown) run.lines.push(line);
    else runs.push({ shown, lines: [line] });
  });

  const blocks: DiffBlock[] = [];
  for (const run of runs) {
    const folded = !run.shown && run.lines.length >= MIN_FOLDED_LINES;
    const previous = blocks.at(-1);
    if (folded) blocks.push({ kind: "folded", lines: run.lines });
    else if (previous?.kind === "lines") {
      blocks[blocks.length - 1] = {
        kind: "lines",
        lines: [...previous.lines, ...run.lines],
      };
    } else blocks.push({ kind: "lines", lines: run.lines });
  }
  return blocks;
}

/** How `after` differs from `before`: what was added since, and what was removed. */
export function compareTexts(before: string, after: string): Comparison {
  const changes = diffArrays(linesOf(before), linesOf(after), { timeout: TIMEOUT_MS });
  if (!changes) return { ok: false };
  const deadline = Date.now() + TIMEOUT_MS;

  const lines: DiffLine[] = [];
  let beforeLine = 1;
  let afterLine = 1;
  let added = 0;
  let removed = 0;

  for (let index = 0; index < changes.length; index++) {
    const change = changes[index];
    if (!change) continue;
    if (!change.added && !change.removed) {
      for (const text of change.value) {
        lines.push({
          kind: "same",
          before: beforeLine++,
          after: afterLine++,
          segments: whole(text),
        });
      }
      continue;
    }

    // A removal next to an addition is a replacement: its lines are paired up so the
    // words that changed in each can be marked.
    const gone: string[] = [];
    const come: string[] = [];
    for (; index < changes.length; index++) {
      const part = changes[index];
      if (!part || (!part.added && !part.removed)) break;
      (part.added ? come : gone).push(...part.value);
    }
    index--;

    const pairs = gone.map((text, k) => {
      const replacement = come[k];
      if (replacement === undefined || Date.now() > deadline) return null;
      return wordSegments(text, replacement);
    });
    gone.forEach((text, k) => {
      const segments = pairs[k]?.[0] ?? whole(text);
      lines.push({ kind: "removed", before: beforeLine++, after: null, segments });
    });
    come.forEach((text, k) => {
      const segments = pairs[k]?.[1] ?? whole(text);
      lines.push({ kind: "added", before: null, after: afterLine++, segments });
    });
    removed += gone.length;
    added += come.length;
  }

  return { ok: true, blocks: fold(lines), added, removed };
}
