import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PaneEmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  /** A hint or action shown under the description. */
  readonly children?: ReactNode;
}

export function PaneEmptyState({
  icon: Icon,
  title,
  description,
  children,
}: PaneEmptyStateProps) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex size-9 items-center justify-center rounded-lg border bg-surface-raised text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-medium text-balance">{title}</h3>
      <p className="mt-1 max-w-[36ch] text-pretty text-muted-foreground">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
