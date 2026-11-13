import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A sheet of A4 paper at true size, scaled as a whole by `scale`. The typeset
 * document always sits on one of these, in both themes, so the preview reads as the
 * printed page rather than as more interface.
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
        "mx-auto min-h-[297mm] w-[210mm] rounded-[1px] bg-paper p-[var(--page-margin,30mm)] text-ink shadow-paper selection:bg-highlight/45",
        className,
      )}
    >
      {children}
    </div>
  );
}
