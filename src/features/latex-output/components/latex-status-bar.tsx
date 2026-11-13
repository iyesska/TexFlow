import { LoaderCircle } from "lucide-react";

const numberFormat = new Intl.NumberFormat("es");

function lineCount(latex: string): number {
  if (latex === "") return 0;
  return latex.replace(/\n$/, "").split("\n").length;
}

function linesLabel(count: number): string {
  return `${numberFormat.format(count)} ${count === 1 ? "línea" : "líneas"}`;
}

function stateLabel(isPending: boolean, hasError: boolean): string {
  if (isPending) return "Convirtiendo…";
  return hasError ? "Sin actualizar" : "Actualizado";
}

/** Whether the LaTeX matches the Markdown, and how long it is. */
export function LatexStatusBar({
  latex,
  isPending,
  hasError,
  warnings,
}: {
  latex: string | null;
  isPending: boolean;
  hasError: boolean;
  warnings: readonly string[];
}) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t px-3 text-xs text-muted-foreground tabular-nums">
      <span role="status" className="flex items-center gap-1.5">
        {isPending ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : null}
        {stateLabel(isPending, hasError)}
      </span>
      {warnings.length > 0 ? (
        <span className="truncate text-warning" title={warnings.join("\n")}>
          {warnings.length === 1
            ? "1 aviso de Pandoc"
            : `${warnings.length} avisos de Pandoc`}
        </span>
      ) : null}
      {latex !== null ? (
        <span className="ml-auto">{linesLabel(lineCount(latex))}</span>
      ) : null}
    </div>
  );
}
