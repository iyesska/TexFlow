import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

function stateLabel(isPending: boolean, hasError: boolean, readyLabel: string): string {
  if (isPending) return "Convirtiendo…";
  return hasError ? "Sin actualizar" : readyLabel;
}

/** The foot of a pane fed by the server: whether its content matches the Markdown. */
export function ConversionStatusBar({
  isPending,
  hasError,
  warnings,
  readyLabel,
  children,
}: {
  isPending: boolean;
  hasError: boolean;
  warnings: readonly string[];
  /** Shown when the content is current, e.g. "Actualizado". */
  readyLabel: string;
  /** Extra information, right-aligned. */
  children?: ReactNode;
}) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t px-3 text-xs text-muted-foreground tabular-nums">
      <span role="status" className="flex items-center gap-1.5">
        {isPending ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : null}
        {stateLabel(isPending, hasError, readyLabel)}
      </span>
      {warnings.length > 0 ? (
        <span className="truncate text-warning" title={warnings.join("\n")}>
          {warnings.length === 1
            ? "1 aviso de Pandoc"
            : `${warnings.length} avisos de Pandoc`}
        </span>
      ) : null}
      {children ? <span className="ml-auto">{children}</span> : null}
    </div>
  );
}
