import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PaneFrameProps {
  /** Id of the element that names the pane, for `aria-labelledby`. */
  readonly labelledBy?: string;
  readonly header: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/** The chrome shared by every pane: a bordered surface with a header row. */
export function PaneFrame({
  labelledBy,
  header,
  actions,
  children,
  className,
}: PaneFrameProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-pane",
        className,
      )}
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b pr-1.5 pl-3">
        <div className="flex min-w-0 items-center gap-2">{header}</div>
        {actions ? (
          <div className="ml-auto flex items-center gap-0.5">{actions}</div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
