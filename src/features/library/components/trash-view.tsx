"use client";

import { Ellipsis, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TRASH_RETENTION_DAYS, type TrashedDocumentDto } from "@/contracts/documents";
import { TemplateThumbnail } from "@/features/templates/components/template-thumbnail";
import { formatChangedAt } from "@/lib/relative-time";
import { templateById, templateSettings } from "@/templates/catalog";

import type { Trash } from "../hooks/use-trash";
import { visibleTrash } from "../model/library-state";
import { EmptyTrash, NoMatches } from "./library-empty";

export interface TrashActions {
  restore(document: TrashedDocumentDto): void;
  deleteForever(document: TrashedDocumentDto): void;
}

const DAY_MS = 86_400_000;

/** "Eliminado hace 2 días · se borrará en 28 días". */
export function trashLine(deletedAt: string, now: Date): string {
  const deletedTime = new Date(deletedAt).getTime();
  // Deleted after `now` was read, or by a server clock a little ahead: just now.
  const reference = new Date(Math.max(now.getTime(), deletedTime));
  const deleted = formatChangedAt(deletedAt, reference);
  const when = /^\d/.test(deleted) ? `el ${deleted}` : deleted;
  const left = Math.ceil(
    (deletedTime + TRASH_RETENTION_DAYS * DAY_MS - reference.getTime()) / DAY_MS,
  );
  const purge =
    left <= 0
      ? "se borrará hoy"
      : left === 1
        ? "se borrará mañana"
        : `se borrará en ${left} días`;
  return `Eliminado ${when} · ${purge}`;
}

function TrashRow({
  document,
  now,
  actions,
}: {
  document: TrashedDocumentDto;
  now: Date;
  actions: TrashActions;
}) {
  const template = templateById(document.templateId);
  const items = (Item: typeof DropdownMenuItem | typeof ContextMenuItem) => (
    <>
      <Item onSelect={() => actions.restore(document)}>
        <RotateCcw />
        Restaurar
      </Item>
      <Item variant="destructive" onSelect={() => actions.deleteForever(document)}>
        <Trash2 />
        Eliminar para siempre…
      </Item>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li className="group flex items-center gap-3.5 rounded-lg px-3 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/60">
          <TemplateThumbnail
            settings={templateSettings(document.templateId)}
            structure={template.structure}
            className="w-8 opacity-60 grayscale"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground/90">
              {document.title}
            </p>
            <p
              className="mt-0.5 truncate text-xs text-muted-foreground"
              suppressHydrationWarning
            >
              {trashLine(document.deletedAt, now)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.restore(document)}
            aria-label={`Restaurar «${document.title}»`}
            className="shrink-0 bg-transparent"
          >
            <RotateCcw />
            <span className="max-sm:sr-only">Restaurar</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones de «${document.title}»`}
                className="shrink-0 text-muted-foreground"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {items(DropdownMenuItem)}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">{items(ContextMenuItem)}</ContextMenuContent>
    </ContextMenu>
  );
}

function TrashSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden>
      {["w-2/5", "w-1/2", "w-1/3"].map((width) => (
        <div key={width} className="flex items-center gap-3.5 px-3 py-2.5">
          <Skeleton className="h-11 w-8" />
          <div className="grid flex-1 gap-2">
            <Skeleton className={`h-3.5 ${width}`} />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** What was deleted: read when shown, restorable for TRASH_RETENTION_DAYS. */
export function TrashView({
  trash,
  query,
  actions,
}: {
  trash: Trash;
  query: string;
  actions: TrashActions;
}) {
  const { load, list, retry } = trash;
  // Its own clock, read when it opens: documents may have been deleted since the
  // library did.
  const [now] = useState(() => new Date());
  // Read on every visit: another tab may have deleted or restored meanwhile.
  useEffect(() => {
    void load();
  }, [load]);

  if (list.status === "loading") return <TrashSkeleton />;
  if (list.status === "failed") {
    return (
      <div role="alert" className="grid justify-items-start gap-2 px-3 py-6 text-ui">
        <p className="text-muted-foreground">
          No se pudo abrir la papelera. {list.message}
        </p>
        <Button size="sm" variant="outline" onClick={retry}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (list.documents.length === 0) return <EmptyTrash />;
  const shown = visibleTrash(list.documents, query);
  if (shown.length === 0) return <NoMatches query={query} />;
  return (
    <ul aria-label="Papelera" className="grid gap-px">
      {shown.map((document) => (
        <TrashRow key={document.id} document={document} now={now} actions={actions} />
      ))}
    </ul>
  );
}
