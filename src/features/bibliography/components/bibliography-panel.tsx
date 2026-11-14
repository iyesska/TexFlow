"use client";

import {
  BookMarked,
  Copy,
  Download,
  Ellipsis,
  FileCode,
  List,
  PenLine,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { BibEntry } from "@/documents/bibtex";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import { documentTitle } from "@/features/document/model/document-session";
import { exportFileName } from "@/features/document/model/file-name";
import { usePanel } from "@/features/workspace/hooks/use-workspace-panels";
import { downloadTextFile } from "@/lib/download";

import { useBibliography, type Bibliography } from "../hooks/use-bibliography";
import { filterReferences, typeLabel, type Reference } from "../model/references";
import { ReferenceDialog } from "./reference-dialog";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const count = (n: number, one: string, many: string) =>
  n === 1 ? `1 ${one}` : `${n} ${many}`;

function ReferenceRow({
  reference,
  onCite,
  onEdit,
  onRemove,
}: {
  reference: Reference;
  onCite: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const byline = [reference.authors, reference.year, reference.source]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex gap-3 border-b px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-ui leading-snug font-medium text-pretty">{reference.title}</p>
        {byline ? <p className="mt-0.5 text-xs text-muted-foreground">{byline}</p> : null}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1 py-px font-mono text-2xs text-foreground">
            @{reference.key}
          </code>
          <span>{typeLabel(reference.type)}</span>
          {reference.cited ? (
            <span className="text-success">Citada en el texto</span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-start gap-1">
        <Button size="xs" variant="outline" onClick={onCite}>
          Citar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Acciones de «${reference.key}»`}
              className="text-muted-foreground"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={onEdit}>
              <PenLine />
              Editar…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void navigator.clipboard.writeText(`@${reference.key}`);
                toast.success("Clave copiada");
              }}
            >
              <Copy />
              Copiar la clave
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/** What does not read, and what the text cites without a reference. */
function Notices({
  bibliography,
  onShowSource,
  onAddMissing,
}: {
  bibliography: Bibliography;
  onShowSource: () => void;
  onAddMissing: (key: string) => void;
}) {
  const { problems, missing } = bibliography;
  if (problems.length === 0 && missing.length === 0) return null;
  return (
    <div className="grid gap-2 border-b px-4 py-3">
      {problems.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-destructive">
            <TriangleAlert className="size-3.5" aria-hidden />
            El BibTeX tiene {count(problems.length, "problema", "problemas")}
          </p>
          <ul className="mt-1 grid gap-0.5 text-muted-foreground">
            {problems.slice(0, 5).map((problem) => (
              <li key={`${problem.line}-${problem.message}`}>
                Línea {problem.line}: {problem.message}
              </li>
            ))}
          </ul>
          <Button
            variant="link"
            size="xs"
            className="mt-1 h-auto px-0"
            onClick={onShowSource}
          >
            Corregirlo en el BibTeX
          </Button>
        </div>
      ) : null}
      {missing.length > 0 ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
          <p className="font-medium text-warning">
            El texto cita claves que no están aquí
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {missing.map((key) => (
              <li key={key}>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onAddMissing(key)}
                  aria-label={`Añadir la referencia ${key}`}
                >
                  <Plus />@{key}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The document's references: the list to cite from, the form to add and edit them,
 * and the BibTeX itself for whoever prefers it. Not modal: the editor stays usable,
 * so citations go where the cursor is.
 */
export function BibliographyPanel() {
  const session = useDocumentSession();
  const bibliography = useBibliography();
  const [query, setQuery] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [dialog, setDialog] = useState<{ entry?: BibEntry; key?: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = usePanel("references");

  const shown = filterReferences(bibliography.references, query);
  const takenKeys = new Set(bibliography.references.map(({ key }) => key));
  const total = bibliography.references.length;

  const cite = (key: string) => {
    if (!bibliography.cite(key)) {
      toast("Muestra el panel Markdown para citar", {
        description: "La cita se escribe donde está el cursor del editor.",
      });
    }
  };

  const exportBibtex = () => {
    const name = exportFileName(documentTitle(session.getSnapshot()), "bib");
    downloadTextFile(name, bibliography.bibtex, "application/x-bibtex");
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("El archivo es demasiado grande", {
        description: "Un archivo .bib puede tener hasta 2 MB.",
      });
      return;
    }
    const { added, skipped } = bibliography.importText(await file.text());
    if (added === 0 && skipped === 0) {
      toast.error(`«${file.name}» no tiene referencias BibTeX`);
      return;
    }
    toast.success(count(added, "referencia añadida", "referencias añadidas"), {
      description:
        skipped > 0
          ? `${count(skipped, "ya estaba", "ya estaban")} por su clave.`
          : undefined,
    });
  };

  return (
    <Sheet modal={false} open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Referencias del documento"
              // On a phone the view menu opens it: the top bar has no room.
              className="text-muted-foreground max-sm:hidden"
            >
              <BookMarked />
              <span className="hidden 2xl:inline">Referencias</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {total === 0 ? "Sin referencias" : count(total, "referencia", "referencias")}
        </TooltipContent>
      </Tooltip>

      <SheetContent
        side="right"
        // The panel stays open while the writer cites from the editor.
        onInteractOutside={(event) => event.preventDefault()}
        className="w-full gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 pt-4 pb-3.5">
          <SheetTitle className="text-sm">Referencias</SheetTitle>
          <SheetDescription className="text-xs">
            Cítalas con @clave o [@clave, p. 12]. Las citadas se listan al final del
            documento, en el estilo elegido en Diseño.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          {showSource ? (
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              El BibTeX del documento. Se guarda solo.
            </p>
          ) : (
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por autor, título o clave"
                aria-label="Buscar referencias"
                className="h-7 pl-7 text-xs"
              />
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => setDialog({})}>
            <Plus />
            Nueva
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Más acciones de las referencias"
                className="text-muted-foreground"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
                <Upload />
                Importar un archivo .bib…
              </DropdownMenuItem>
              <DropdownMenuItem disabled={total === 0} onSelect={exportBibtex}>
                <Download />
                Exportar como .bib
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setShowSource((value) => !value)}>
                {showSource ? <List /> : <FileCode />}
                {showSource ? "Ver la lista" : "Editar el BibTeX"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInput}
            type="file"
            accept=".bib,text/x-bibtex,application/x-bibtex,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>

        <Notices
          bibliography={bibliography}
          onShowSource={() => setShowSource(true)}
          onAddMissing={(key) => setDialog({ key })}
        />

        {showSource ? (
          <textarea
            value={bibliography.bibtex}
            onChange={(event) => bibliography.setBibtex(event.target.value)}
            aria-label="BibTeX del documento"
            spellCheck={false}
            placeholder={
              "@book{clave,\n  author = {Apellido, Nombre},\n  title = {Título},\n  year = {2024}\n}"
            }
            className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
          />
        ) : total === 0 ? (
          <div className="flex flex-1 flex-col items-center px-8 py-14 text-center">
            <span className="grid size-10 place-items-center rounded-xl border bg-surface text-muted-foreground">
              <BookMarked className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-medium">Aún no hay referencias</p>
            <p className="mt-1 text-ui text-pretty text-muted-foreground">
              Añade una a mano, o importa el archivo .bib que exporta tu gestor de
              referencias (Zotero, Mendeley, JabRef).
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInput.current?.click()}
              >
                <Upload />
                Importar .bib
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialog({})}>
                <Plus />
                Nueva referencia
              </Button>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-ui text-muted-foreground">
            Ninguna referencia contiene «{query.trim()}».
          </p>
        ) : (
          <ul aria-label="Referencias" className="min-h-0 flex-1 overflow-y-auto">
            {shown.map((reference) => (
              <ReferenceRow
                key={reference.key}
                reference={reference}
                onCite={() => cite(reference.key)}
                onEdit={() => setDialog({ entry: reference.entry })}
                onRemove={() => bibliography.remove(reference.key)}
              />
            ))}
          </ul>
        )}
      </SheetContent>

      {dialog ? (
        <ReferenceDialog
          {...(dialog.entry ? { entry: dialog.entry } : {})}
          {...(dialog.key ? { initialKey: dialog.key } : {})}
          takenKeys={takenKeys}
          onSave={(entry, extra) => {
            if (dialog.entry) bibliography.update(dialog.entry.key, entry, extra);
            else bibliography.add(entry);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </Sheet>
  );
}
