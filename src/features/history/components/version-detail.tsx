"use client";

import { ArrowLeft, Info, LoaderCircle, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { VersionDto, VersionSummaryDto } from "@/contracts/documents";
import {
  useDocumentBibliography,
  useDocumentMarkdown,
  useDocumentSettings,
} from "@/features/document/hooks/use-document";
import { cn } from "@/lib/utils";
import { settingsKey } from "@/templates/settings";

import type { ContentState } from "../hooks/use-version-history";
import { compareTexts, type Comparison } from "../model/compare";
import { versionMoment, versionName } from "../model/timeline";
import { VersionChanges } from "./version-changes";

const linesWord = (count: number) => (count === 1 ? "1 línea" : `${count} líneas`);

export function TextSkeleton() {
  return (
    <div className="grid gap-2 p-4" aria-hidden>
      {["w-3/5", "w-11/12", "w-4/5", "w-10/12", "w-2/5", "w-9/12"].map((width) => (
        <Skeleton key={width} className={cn("h-3.5", width)} />
      ))}
    </div>
  );
}

export function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-2 p-4 text-ui">
      <p className="text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/** What else a restore brings back, besides the text. */
function useAlsoRestored(version: VersionDto | null): string | null {
  const settings = settingsKey(useDocumentSettings());
  const bibliography = useDocumentBibliography();
  if (!version) return null;
  const design = settingsKey(version.settings) !== settings;
  const references = version.bibliography !== bibliography;
  if (design && references) return "su diseño y sus referencias";
  if (design) return "su diseño";
  if (references) return "sus referencias";
  return null;
}

/** "+12 −3", and the same in words for those who cannot see the colours. */
function ChangeCounts({ comparison }: { comparison: Comparison | null }) {
  if (!comparison?.ok || comparison.blocks.length === 0) return null;
  return (
    <>
      {" · "}
      <span className="text-success">+{comparison.added}</span>{" "}
      <span className="text-destructive">−{comparison.removed}</span>{" "}
      <span className="sr-only">
        ({linesWord(comparison.added)} añadidas y {linesWord(comparison.removed)}{" "}
        eliminadas desde entonces)
      </span>
    </>
  );
}

function VersionBody({
  version,
  comparison,
  view,
}: {
  version: VersionDto;
  comparison: Comparison | null;
  view: "changes" | "text";
}) {
  if (view === "text") {
    return (
      <pre className="p-4 font-mono text-xs leading-5 break-words whitespace-pre-wrap">
        {version.markdown || "(Documento vacío)"}
      </pre>
    );
  }
  if (!comparison) return null;
  if (!comparison.ok) {
    return (
      <p className="p-4 text-ui text-muted-foreground">
        Esta versión y el texto actual son demasiado distintos para compararlos aquí.
        Puedes ver su texto completo.
      </p>
    );
  }
  if (comparison.blocks.length === 0) {
    return (
      <p className="p-4 text-ui text-muted-foreground">
        El texto no ha cambiado desde esta versión.
      </p>
    );
  }
  return <VersionChanges key={version.id} blocks={comparison.blocks} />;
}

export interface VersionDetailProps {
  readonly selected: VersionSummaryDto;
  /** Undefined while the version is being read. */
  readonly content: ContentState | undefined;
  readonly now: Date;
  /** The version being restored, if any: nothing else can be restored meanwhile. */
  readonly restoring: string | null;
  onRetry(): void;
  onRestore(): void;
  /** Back to the list, on a phone. */
  onBack(): void;
}

/** One version: when it was kept, how the text changed since, and the way back to it. */
export function VersionDetail(props: VersionDetailProps) {
  const { selected, content, now, restoring } = props;
  const markdown = useDocumentMarkdown();
  const [view, setView] = useState<"changes" | "text">("changes");
  const version = content?.status === "ready" ? content.version : null;
  const comparison = useMemo(
    () => (version ? compareTexts(version.markdown, markdown) : null),
    [version, markdown],
  );
  const extra = useAlsoRestored(version);

  return (
    <>
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b px-4 py-3">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Volver a las versiones"
          className="-ml-1.5 md:hidden"
          onClick={props.onBack}
        >
          <ArrowLeft />
        </Button>
        {/* On a narrow screen the controls drop below rather than squeeze this. */}
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="truncate text-sm font-medium">{versionName(selected)}</h3>
          <p className="text-xs text-muted-foreground first-letter:uppercase">
            {versionMoment(selected.createdAt, now)}
            <ChangeCounts comparison={comparison} />
          </p>
        </div>
        <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
          <ToggleGroup
            type="single"
            size="sm"
            spacing={0.5}
            aria-label="Qué mostrar"
            value={view}
            // Radix reports "" when the pressed item is clicked again: keep one.
            onValueChange={(next) => {
              if (next === "changes" || next === "text") setView(next);
            }}
            className="rounded-lg border bg-background p-0.5"
          >
            <ToggleGroupItem value="changes">Cambios</ToggleGroupItem>
            <ToggleGroupItem value="text">Texto</ToggleGroupItem>
          </ToggleGroup>
          <Button
            size="sm"
            disabled={!version || restoring !== null}
            onClick={props.onRestore}
          >
            {restoring === selected.id ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <RotateCcw />
            )}
            Restaurar
          </Button>
        </div>
      </header>

      {extra ? (
        <p className="flex items-center gap-2 border-b bg-info/8 px-4 py-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0 text-info" aria-hidden />
          Al restaurarla también vuelven {extra}.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {!content ? <TextSkeleton /> : null}
        {content?.status === "failed" ? (
          <Problem
            message={`No se pudo abrir esta versión. ${content.message}`}
            onRetry={props.onRetry}
          />
        ) : null}
        {version ? (
          <VersionBody version={version} comparison={comparison} view={view} />
        ) : null}
      </div>
    </>
  );
}
