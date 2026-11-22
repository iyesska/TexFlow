"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import type { DiffBlock, DiffLine, LineKind } from "../model/compare";

const SIGNS: Readonly<Record<LineKind, string>> = { same: "", removed: "−", added: "+" };

/** Said before a changed line, for those who cannot see its colour or sign. */
const SPOKEN: Readonly<Record<LineKind, string>> = {
  same: "",
  removed: "Eliminada desde entonces: ",
  added: "Añadida desde entonces: ",
};

const LINE_STYLES: Readonly<Record<LineKind, string>> = {
  same: "",
  removed: "bg-destructive/8",
  added: "bg-success/8",
};

const SIGN_STYLES: Readonly<Record<LineKind, string>> = {
  same: "",
  removed: "text-destructive",
  added: "text-success",
};

function LineText({ line }: { line: DiffLine }) {
  return (
    <>
      {line.segments.map((segment, index) => {
        if (!segment.changed) return <span key={index}>{segment.text}</span>;
        return line.kind === "removed" ? (
          <del
            key={index}
            className="rounded-[3px] bg-destructive/22 decoration-destructive/70"
          >
            {segment.text}
          </del>
        ) : (
          <ins key={index} className="rounded-[3px] bg-success/22 no-underline">
            {segment.text}
          </ins>
        );
      })}
    </>
  );
}

function Line({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2.25rem_2.25rem_1rem_minmax(0,1fr)] sm:grid-cols-[2.75rem_2.75rem_1.25rem_minmax(0,1fr)]",
        LINE_STYLES[line.kind],
      )}
    >
      {/* The line's number in the version, then in the current text. */}
      <span aria-hidden className="pr-2 text-right text-faint-foreground select-none">
        {line.before ?? ""}
      </span>
      <span aria-hidden className="pr-2 text-right text-faint-foreground select-none">
        {line.after ?? ""}
      </span>
      <span aria-hidden className={cn("text-center select-none", SIGN_STYLES[line.kind])}>
        {SIGNS[line.kind]}
      </span>
      <span className="pr-4 break-words whitespace-pre-wrap">
        {line.kind === "same" ? null : (
          <span className="sr-only">{SPOKEN[line.kind]}</span>
        )}
        <LineText line={line} />
      </span>
    </div>
  );
}

const linesWord = (count: number) => (count === 1 ? "1 línea" : `${count} líneas`);

/** The changes since a version, line by line; unchanged stretches fold away. */
export function VersionChanges({ blocks }: { blocks: readonly DiffBlock[] }) {
  const [unfolded, setUnfolded] = useState<ReadonlySet<number>>(new Set());

  return (
    <section
      aria-label="Cambios desde esta versión"
      className="py-2 font-mono text-xs leading-5"
    >
      {blocks.map((block, index) => {
        if (block.kind === "lines" || unfolded.has(index)) {
          return (
            <div key={index}>
              {block.lines.map((line) => (
                <Line key={`${line.before}:${line.after}`} line={line} />
              ))}
            </div>
          );
        }
        return (
          <button
            key={index}
            type="button"
            onClick={() => setUnfolded((current) => new Set(current).add(index))}
            className="flex w-full items-center gap-2 border-y border-dashed bg-muted/40 py-1 pl-3 text-left font-sans text-2xs text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronsUpDown className="size-3" aria-hidden />
            Mostrar {linesWord(block.lines.length)} sin cambios
          </button>
        );
      })}
    </section>
  );
}
