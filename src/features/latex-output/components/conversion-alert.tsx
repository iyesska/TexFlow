"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ConversionError, ConversionErrorCode } from "@/contracts/convert";

/** Errors the writer fixes in the document; retrying the same text cannot help. */
const NOT_RETRYABLE: ReadonlySet<ConversionErrorCode> = new Set(["syntax", "too-large"]);

/** Explains a failed conversion above the last LaTeX that did convert. */
export function ConversionAlert({
  error,
  hasPreviousOutput,
  onRetry,
}: {
  error: ConversionError;
  hasPreviousOutput: boolean;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="shrink-0 border-b bg-destructive/8 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <TriangleAlert
          className="mt-0.5 size-3.5 shrink-0 text-destructive"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-pretty">{error.message}</p>
          {error.line ? (
            <p className="mt-0.5 text-muted-foreground">
              {error.code === "syntax"
                ? `Línea ${error.line} del bloque de metadatos.`
                : `Línea ${error.line}.`}
            </p>
          ) : null}
          {error.detail ? (
            <pre className="mt-1.5 max-h-24 overflow-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground">
              {error.detail}
            </pre>
          ) : null}
          {hasPreviousOutput ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Se muestra el último código que se pudo generar.
            </p>
          ) : null}
        </div>
        {NOT_RETRYABLE.has(error.code) ? null : (
          <Button variant="outline" size="xs" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
