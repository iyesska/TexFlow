import type { CSSProperties } from "react";

import type { DocumentStructure } from "@/templates/catalog";
import { PAPER_SIZES, type DocumentSettings } from "@/templates/settings";

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;

/** A line of text, drawn as a bar. */
function Bar({ width = "100%", strong = false }: { width?: string; strong?: boolean }) {
  return (
    <span
      className={strong ? "block h-[2px] bg-ink/55" : "block h-px bg-ink/30"}
      style={{ width }}
    />
  );
}

function CoverPage() {
  return (
    <span className="flex h-full flex-col items-center pt-[22%]">
      <Bar width="70%" strong />
      <span className="mt-[3px]">
        <Bar width="0.9rem" />
      </span>
      <span className="mt-auto">
        <Bar width="0.6rem" />
      </span>
    </span>
  );
}

function TextPage({
  settings,
  structure,
}: {
  settings: DocumentSettings;
  structure: DocumentStructure;
}) {
  // Wider spacing leaves fewer, looser lines on the page.
  const gap = `${Math.round(settings.lineSpacing * 2)}px`;
  const lines = settings.lineSpacing >= 1.5 ? 4 : 6;
  return (
    <span className="flex flex-col" style={{ gap }}>
      {structure === "book" ? (
        <span className="mb-[2px]">
          <Bar width="55%" strong />
        </span>
      ) : (
        <span className="mb-[2px] flex justify-center">
          <Bar width="60%" strong />
        </span>
      )}
      <Bar width="40%" strong />
      {Array.from({ length: lines }, (_, index) => (
        <Bar key={index} width={index === lines - 1 ? "65%" : "100%"} />
      ))}
    </span>
  );
}

/**
 * A miniature of a template's first page: its margins, running head, line spacing and
 * how the title is set. Decorative; the template's name and description say the rest.
 */
export function TemplateThumbnail({
  settings,
  structure,
}: {
  settings: DocumentSettings;
  structure: DocumentStructure;
}) {
  const paper = PAPER_SIZES[settings.paperSize];
  const { top, bottom, left, right } = settings.margins;
  const textBox: CSSProperties = {
    top: percent(top, paper.height),
    bottom: percent(bottom, paper.height),
    left: percent(left, paper.width),
    right: percent(right, paper.width),
  };
  const cover = settings.cover === "page";

  return (
    <span
      aria-hidden
      className="relative block w-12 shrink-0 rounded-[2px] bg-paper shadow-[0_1px_2px_oklch(0_0_0/0.35)]"
      style={{ aspectRatio: `${paper.width} / ${paper.height}` }}
    >
      {settings.header !== "none" && !cover ? (
        <span
          className="absolute h-px bg-ink/40"
          style={{
            left: textBox.left,
            right: textBox.right,
            top: `calc(${textBox.top} - 3px)`,
          }}
        />
      ) : null}
      <span className="absolute overflow-hidden" style={textBox}>
        {cover ? <CoverPage /> : <TextPage settings={settings} structure={structure} />}
      </span>
      {settings.footer !== "none" && !cover ? (
        <span
          className="absolute size-[2px] rounded-full bg-ink/45"
          style={{
            bottom: `calc(${textBox.bottom} - 4px)`,
            ...(settings.footer === "page-outer"
              ? { right: textBox.right }
              : { left: "50%", transform: "translateX(-50%)" }),
          }}
        />
      ) : null}
    </span>
  );
}
