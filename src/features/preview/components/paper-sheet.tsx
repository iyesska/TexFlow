import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A sheet of paper at true size, scaled as a whole by `scale`. Its size and margins
 * come from the --page-* properties of the document's template (A4 with 25 mm margins
 * when none is set). The document always sits on one of these, in both themes, so
 * the preview reads as the printed page rather than as more interface.
 */
export function PaperSheet({
  scale,
  children,
  className,
}: {
  scale: number;
  children?: ReactNode;
  className?: string;
}) {
  // CSS zoom scales layout as well as paint, so scrolling and centring stay correct.
  const style: CSSProperties = { zoom: scale };
  return (
    <div
      style={style}
      className={cn(
        "mx-auto min-h-[var(--page-height,297mm)] w-[var(--page-width,210mm)] rounded-[1px] bg-paper text-ink shadow-paper selection:bg-highlight/45",
        "pt-[var(--page-margin-top,25mm)] pr-[var(--page-margin-right,25mm)] pb-[var(--page-margin-bottom,25mm)] pl-[var(--page-margin-left,25mm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
