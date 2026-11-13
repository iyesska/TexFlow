"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadTextFile } from "@/lib/download";

interface LatexToolbarProps {
  /** The code to copy or download, or null while there is none that is up to date. */
  readonly latex: string | null;
  readonly standalone: boolean;
  readonly onStandaloneChange: (standalone: boolean) => void;
  /** Name for the downloaded file, e.g. "mi-tesis.tex". */
  readonly fileName: string;
}

const MODE = { document: "document", body: "body" } as const;

async function copyLatex(latex: string) {
  try {
    await navigator.clipboard.writeText(latex);
    toast.success("Código LaTeX copiado");
  } catch {
    toast.error("No se pudo copiar", {
      description:
        "El navegador bloqueó el portapapeles. Selecciona el código y cópialo a mano.",
    });
  }
}

/** Output options and the two ways of taking the LaTeX elsewhere. */
export function LatexToolbar({
  latex,
  standalone,
  onStandaloneChange,
  fileName,
}: LatexToolbarProps) {
  const isEmpty = !latex;

  return (
    <div className="no-scrollbar flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b pr-1.5 pl-2">
      <ToggleGroup
        type="single"
        size="sm"
        spacing={0.5}
        aria-label="Qué generar"
        value={standalone ? MODE.document : MODE.body}
        // Radix reports "" when the pressed item is clicked again: one stays selected.
        onValueChange={(value) => {
          if (value) onStandaloneChange(value === MODE.document);
        }}
      >
        <ToggleGroupItem value={MODE.document}>Documento completo</ToggleGroupItem>
        <ToggleGroupItem value={MODE.body}>Solo el cuerpo</ToggleGroupItem>
      </ToggleGroup>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copiar código"
              disabled={isEmpty}
              onClick={() => latex && void copyLatex(latex)}
              className="text-muted-foreground"
            >
              <Copy />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            Copiar código
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Descargar .tex"
              disabled={isEmpty}
              onClick={() =>
                latex && downloadTextFile(fileName, latex, "application/x-tex")
              }
              className="text-muted-foreground"
            >
              <Download />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            Descargar {fileName}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
