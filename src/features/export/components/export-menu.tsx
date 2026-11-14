"use client";

import { Download, FileArchive, FileCode, FileText, FileType } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useExports } from "../hooks/use-exports";

/** Offers the document in every form it can leave the application. */
export function ExportMenu() {
  const { exportPdf, exportLatex, exportMarkdown, exportProject } = useExports();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" aria-label="Exportar">
          <Download />
          <span className="max-sm:sr-only">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={exportPdf}>
          <FileType />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportLatex}>
          <FileCode />
          LaTeX (.tex)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportMarkdown}>
          <FileText />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={exportProject}>
          <FileArchive />
          Proyecto completo (.zip)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
