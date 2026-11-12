import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A sheet of A4 paper. The typeset document always sits on one of these, in both
 * themes, so the preview reads as the printed page rather than as more interface.
 */
export function PaperSheet({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto aspect-[210/297] w-full max-w-[40rem] rounded-xs bg-paper font-serif text-ink shadow-paper selection:bg-highlight/45",
        className,
      )}
    >
      {children}
    </div>
  );
}
