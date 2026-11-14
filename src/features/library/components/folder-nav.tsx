"use client";

import {
  Ellipsis,
  FileText,
  Folder,
  FolderMinus,
  FolderPlus,
  PenLine,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

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
import type { FolderDto } from "@/contracts/documents";
import { cn } from "@/lib/utils";

import { documentCount, type LibraryView } from "../model/library-state";

export interface FolderActions {
  create(): void;
  rename(folder: FolderDto): void;
  remove(folder: FolderDto): void;
}

interface FolderNavProps {
  readonly view: LibraryView;
  readonly onViewChange: (view: LibraryView) => void;
  readonly folders: readonly FolderDto[];
  readonly counts: {
    readonly all: number;
    readonly unfiled: number;
    readonly byFolder: ReadonlyMap<string, number>;
  };
  readonly actions: FolderActions;
}

const isView = (view: LibraryView, other: LibraryView) =>
  view.kind === other.kind &&
  (view.kind !== "folder" || (other.kind === "folder" && view.id === other.id));

function NavItem({
  icon,
  label,
  count,
  selected,
  onSelect,
  menu,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
  menu?: ReactNode;
}) {
  return (
    <li className="group/nav relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "page" : undefined}
        aria-label={`${label}, ${documentCount(count)}`}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-md pr-2 pl-2.5 text-left text-ui transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
          selected
            ? "bg-muted font-medium text-foreground [&_svg]:text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground [&_svg]:text-faint-foreground",
        )}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          aria-hidden
          className={cn(
            "text-xs text-muted-foreground tabular-nums",
            menu &&
              "group-focus-within/nav:invisible group-hover/nav:invisible group-has-[[aria-expanded=true]]/nav:invisible",
          )}
        >
          {count}
        </span>
      </button>
      {menu}
    </li>
  );
}

function FolderMenu({ folder, actions }: { folder: FolderDto; actions: FolderActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Acciones de la carpeta «${folder.name}»`}
          className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover/nav:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onSelect={() => actions.rename(folder)}>
          <PenLine />
          Cambiar nombre…
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(folder)}>
          <Trash2 />
          Eliminar carpeta…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The sidebar: every document, those outside folders, and each folder. */
export function FolderNav({
  view,
  onViewChange,
  folders,
  counts,
  actions,
}: FolderNavProps) {
  return (
    <nav aria-label="Carpetas" className="flex flex-col gap-5">
      <ul className="grid gap-0.5">
        <NavItem
          icon={<FileText />}
          label="Todos los documentos"
          count={counts.all}
          selected={view.kind === "all"}
          onSelect={() => onViewChange({ kind: "all" })}
        />
        <NavItem
          icon={<FolderMinus />}
          label="Fuera de las carpetas"
          count={counts.unfiled}
          selected={view.kind === "unfiled"}
          onSelect={() => onViewChange({ kind: "unfiled" })}
        />
      </ul>
      <div className="grid gap-1">
        <div className="flex items-center justify-between pr-1 pl-2.5">
          <h2 className="text-xs font-medium text-muted-foreground">Carpetas</h2>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Nueva carpeta"
            className="text-muted-foreground"
            onClick={actions.create}
          >
            <FolderPlus />
          </Button>
        </div>
        {folders.length === 0 ? (
          <p className="px-2.5 text-xs text-pretty text-muted-foreground">
            Agrupa tus documentos por asignatura, proyecto o lo que prefieras.
          </p>
        ) : (
          <ul className="grid gap-0.5">
            {folders.map((folder) => (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger asChild>
                  <div>
                    <NavItem
                      icon={<Folder />}
                      label={folder.name}
                      count={counts.byFolder.get(folder.id) ?? 0}
                      selected={isView(view, { kind: "folder", id: folder.id })}
                      onSelect={() => onViewChange({ kind: "folder", id: folder.id })}
                      menu={<FolderMenu folder={folder} actions={actions} />}
                    />
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onSelect={() => actions.rename(folder)}>
                    <PenLine />
                    Cambiar nombre…
                  </ContextMenuItem>
                  <ContextMenuItem
                    variant="destructive"
                    onSelect={() => actions.remove(folder)}
                  >
                    <Trash2 />
                    Eliminar carpeta…
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}

/** On narrow screens the folders become a row of chips above the list. */
export function FolderChips({
  view,
  onViewChange,
  folders,
  counts,
  actions,
}: FolderNavProps) {
  const chip = (selected: boolean) =>
    cn(
      "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      selected
        ? "border-border-strong bg-muted font-medium text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );
  const views: { view: LibraryView; label: string; count: number }[] = [
    { view: { kind: "all" }, label: "Todos", count: counts.all },
    { view: { kind: "unfiled" }, label: "Fuera de carpetas", count: counts.unfiled },
    ...folders.map((folder) => ({
      view: { kind: "folder", id: folder.id } as const,
      label: folder.name,
      count: counts.byFolder.get(folder.id) ?? 0,
    })),
  ];
  return (
    <nav aria-label="Carpetas" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      {views.map((item) => (
        <button
          key={item.view.kind === "folder" ? item.view.id : item.view.kind}
          type="button"
          aria-current={isView(view, item.view) ? "page" : undefined}
          aria-label={`${item.label}, ${documentCount(item.count)}`}
          onClick={() => onViewChange(item.view)}
          className={chip(isView(view, item.view))}
        >
          <span className="max-w-40 truncate">{item.label}</span>
          <span aria-hidden className="text-muted-foreground tabular-nums">
            {item.count}
          </span>
        </button>
      ))}
      <button type="button" onClick={actions.create} className={chip(false)}>
        <FolderPlus className="size-3.5" aria-hidden />
        Nueva carpeta
      </button>
    </nav>
  );
}
