"use client";

import { Ellipsis, PenLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FolderDto } from "@/contracts/documents";

import { documentCount, type LibraryView } from "../model/library-state";
import type { FolderActions } from "./folder-nav";

const VIEW_NAMES = {
  all: "Todos los documentos",
  unfiled: "Fuera de las carpetas",
  trash: "Papelera",
};

/**
 * What the list shows and how many: the folder's own actions sit by its name, so
 * they are at hand on every screen size.
 */
export function ListHeading({
  view,
  folder,
  count,
  actions,
  onEmptyTrash,
}: {
  view: LibraryView;
  folder: FolderDto | undefined;
  count: number;
  actions: FolderActions;
  onEmptyTrash: () => void;
}) {
  const heading = view.kind === "folder" ? (folder?.name ?? "") : VIEW_NAMES[view.kind];
  return (
    <div className="flex min-h-8 items-center gap-2 px-3">
      <h1 className="min-w-0 truncate text-base font-semibold">{heading}</h1>
      {folder ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Acciones de la carpeta «${folder.name}»`}
              className="text-muted-foreground"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onSelect={() => actions.rename(folder)}>
              <PenLine />
              Cambiar nombre…
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => actions.remove(folder)}
            >
              <Trash2 />
              Eliminar carpeta…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
        {documentCount(count)}
      </span>
      {view.kind === "trash" && count > 0 ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={onEmptyTrash}
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
          Vaciar papelera…
        </Button>
      ) : null}
    </div>
  );
}
