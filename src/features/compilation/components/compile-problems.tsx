"use client";

import { CornerDownRight, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CompileFailure, Diagnostic } from "@/contracts/compilation";
import { useEditorSessionCache } from "@/features/editor/hooks/use-editor-session-cache";
import { useWorkspaceLayout } from "@/features/workspace/hooks/use-workspace-layout";

function Problem({ diagnostic }: { diagnostic: Diagnostic }) {
  const editor = useEditorSessionCache();
  const { dispatch } = useWorkspaceLayout();
  const { markdownLine } = diagnostic;

  const goToLine = (line: number) => {
    dispatch({ type: "activate", pane: "markdown" });
    editor.revealLine(line);
  };

  return (
    <li className="rounded-lg border bg-surface p-3">
      <p className="font-medium text-pretty">{diagnostic.message}</p>
      {diagnostic.detail ? (
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {diagnostic.detail}
        </p>
      ) : null}
      {diagnostic.excerpt ? (
        <pre className="mt-2 overflow-x-auto rounded-md bg-background px-2.5 py-1.5 font-mono text-xs">
          {diagnostic.latexLine ? (
            <span className="mr-3 text-faint-foreground select-none">
              {diagnostic.latexLine}
            </span>
          ) : null}
          {diagnostic.excerpt}
        </pre>
      ) : null}
      {markdownLine ? (
        <Button
          variant="outline"
          size="xs"
          className="mt-2.5"
          onClick={() => goToLine(markdownLine)}
        >
          <CornerDownRight />
          Ir a la línea {markdownLine} del Markdown
        </Button>
      ) : null}
    </li>
  );
}

/** Explains why the document did not compile, and where to fix it. */
export function CompileProblems({
  error,
  onRetry,
}: {
  error: CompileFailure["error"];
  onRetry: () => void;
}) {
  const diagnostics = error.diagnostics ?? [];
  // A document error is fixed by editing; anything else may pass on a second try.
  const canRetry = error.code !== "compile-error" && error.code !== "syntax";

  return (
    <div role="alert" className="mx-auto max-w-xl px-5 py-8">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-balance">{error.message}</h3>
          {error.line ? (
            <p className="mt-1 text-muted-foreground">
              Línea {error.line} del bloque de metadatos.
            </p>
          ) : null}
          {error.detail ? (
            <pre className="mt-2 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
              {error.detail}
            </pre>
          ) : null}
        </div>
      </div>
      {diagnostics.length > 0 ? (
        <ul className="mt-5 space-y-2.5">
          {diagnostics.map((diagnostic, index) => (
            <Problem key={index} diagnostic={diagnostic} />
          ))}
        </ul>
      ) : null}
      {canRetry ? (
        <Button className="mt-5" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
