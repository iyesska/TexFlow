"use client";

import { Check, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCompilation } from "@/features/compilation/hooks/use-compilation";
import { useEditorSessionCache } from "@/features/editor/hooks/use-editor-session-cache";
import { useExports } from "@/features/export/hooks/use-exports";
import { useWorkspaceLayout } from "@/features/workspace/hooks/use-workspace-layout";
import { useOpenPanel, usePanel } from "@/features/workspace/hooks/use-workspace-panels";
import { cn } from "@/lib/utils";

import { useFirstSteps } from "../hooks/use-first-steps";
import { FIRST_STEPS, isComplete, type FirstStep } from "../model/first-steps";

interface StepText {
  readonly title: string;
  readonly description: string;
  readonly action: string;
}

const STEPS: Readonly<Record<FirstStep, StepText>> = {
  write: {
    title: "Escribe en Markdown",
    description: "Edita el texto: el LaTeX y la vista previa se actualizan solos.",
    action: "Ir al editor",
  },
  design: {
    title: "Elige una plantilla",
    description: "Siete diseños listos, de un artículo a una tesis. El texto no cambia.",
    action: "Abrir Diseño",
  },
  cite: {
    title: "Cita una referencia",
    description: "Añade una fuente y cítala con @clave: la bibliografía se escribe sola.",
    action: "Abrir Referencias",
  },
  pdf: {
    title: "Compila el PDF",
    description: "LaTeX compone el documento en un entorno aislado, en unos segundos.",
    action: "Compilar",
  },
  export: {
    title: "Llévate tu trabajo",
    description: "Descarga el PDF, el código LaTeX o el proyecto completo.",
    action: "Descargar el PDF",
  },
  commands: {
    title: "Busca cualquier acción",
    description: "Con Ctrl K (⌘ K en Mac) tienes todo a mano sin dejar el teclado.",
    action: "Abrir la paleta",
  },
};

/** A ring that fills as steps are done. */
function ProgressRing({ value }: { value: number }) {
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        className="stroke-muted"
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        className="stroke-highlight transition-[stroke-dashoffset] duration-(--duration-base) ease-out"
      />
    </svg>
  );
}

/**
 * "Primeros pasos": the steps that show what TexFlow does, ticked off as the writer
 * does them, each with a way to do it now. Shown until the writer puts it away.
 */
export function FirstStepsGuide() {
  const { progress, store } = useFirstSteps();
  const [open, setOpen] = usePanel("guide");
  const openPanel = useOpenPanel();
  const editor = useEditorSessionCache();
  const compilation = useCompilation();
  const exports = useExports();
  const { dispatch } = useWorkspaceLayout();

  if (!progress || progress.dismissed) return null;
  const doneCount = progress.done.length;
  const complete = isComplete(progress);
  const next = FIRST_STEPS.find((step) => !progress.done.includes(step));

  const actions: Readonly<Record<FirstStep, () => void>> = {
    write: () => {
      dispatch({ type: "activate", pane: "markdown" });
      editor.run(() => true);
    },
    design: () => openPanel("design"),
    cite: () => openPanel("references"),
    pdf: () => {
      dispatch({ type: "activate", pane: "preview" });
      compilation.setMode("pdf");
      void compilation.compile();
    },
    export: exports.exportPdf,
    commands: () => openPanel("commands"),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={
            complete
              ? "Primeros pasos: completados"
              : `Primeros pasos: ${doneCount} de ${FIRST_STEPS.length} hechos`
          }
          className="text-muted-foreground"
        >
          {complete ? (
            <Check className="text-success" />
          ) : (
            <ProgressRing value={doneCount / FIRST_STEPS.length} />
          )}
          <span className="hidden min-[2000px]:inline">Primeros pasos</span>
          <span className="text-2xs tabular-nums">
            {complete ? "Listo" : `${doneCount}/${FIRST_STEPS.length}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-80 gap-0 p-0">
        <div className="border-b px-3.5 pt-3 pb-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-ui font-medium">Primeros pasos</h2>
            <span className="text-2xs text-muted-foreground tabular-nums">
              {doneCount} de {FIRST_STEPS.length}
            </span>
          </div>
          <progress
            aria-label="Pasos hechos"
            value={doneCount}
            max={FIRST_STEPS.length}
            className="mt-2 block h-1 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-highlight [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-highlight [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-(--duration-base)"
          />
        </div>

        {complete ? (
          <div className="grid justify-items-center gap-1.5 px-5 py-6 text-center">
            <span className="grid size-9 place-items-center rounded-full bg-highlight/15 text-highlight">
              <PartyPopper className="size-4" aria-hidden />
            </span>
            <p className="text-ui font-medium">Ya conoces lo esencial</p>
            <p className="text-xs text-muted-foreground">
              Los atajos de teclado están siempre a mano con la tecla ?.
            </p>
          </div>
        ) : (
          <ol className="grid gap-0.5 p-1.5">
            {FIRST_STEPS.map((step) => {
              const done = progress.done.includes(step);
              const isNext = step === next;
              const text = STEPS[step];
              return (
                <li
                  key={step}
                  className={cn(
                    "flex gap-2.5 rounded-md px-2 py-2",
                    isNext && "bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ring-1",
                      done && "bg-success/15 text-success ring-success/40",
                      !done && isNext && "ring-highlight",
                      !done && !isNext && "ring-border-strong",
                    )}
                  >
                    {done ? (
                      <Check className="size-2.5" strokeWidth={3} aria-hidden />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-ui", done && "text-muted-foreground")}>
                      {text.title}
                      <span className="sr-only">
                        {done ? " (hecho)" : " (pendiente)"}
                      </span>
                    </p>
                    {isNext ? (
                      <>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {text.description}
                        </p>
                        <Button
                          size="xs"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            setOpen(false);
                            actions[step]();
                          }}
                        >
                          {text.action}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex justify-end border-t px-2 py-1.5">
          <Button
            size="xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              setOpen(false);
              store.dismiss();
            }}
          >
            {complete ? "Cerrar la guía" : "Ocultar la guía"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
