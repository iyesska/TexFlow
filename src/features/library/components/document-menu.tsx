"use client";

import {
  Copy,
  CornerDownLeft,
  Folder,
  FolderInput,
  FolderMinus,
  PenLine,
  Trash2,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentSummaryDto, FolderDto } from "@/contracts/documents";

/** What can be done to a document from the library. */
export interface DocumentActions {
  open(document: DocumentSummaryDto): void;
  rename(document: DocumentSummaryDto): void;
  duplicate(document: DocumentSummaryDto): void;
  move(document: DocumentSummaryDto, folderId: string | null): void;
  remove(document: DocumentSummaryDto): void;
}

interface ItemProps {
  readonly children: ReactNode;
  readonly onSelect?: () => void;
  readonly disabled?: boolean;
  readonly variant?: "default" | "destructive";
}

/** The menu parts, so the "…" menu and the right-click menu share their items. */
interface MenuKit {
  readonly Item: ComponentType<ItemProps>;
  readonly Separator: ComponentType;
  readonly Sub: ComponentType<{ children: ReactNode }>;
  readonly SubTrigger: ComponentType<{ children: ReactNode }>;
  readonly SubContent: ComponentType<{ children: ReactNode; className?: string }>;
}

export const DROPDOWN_KIT: MenuKit = {
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};

export const CONTEXT_KIT: MenuKit = {
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};

export function DocumentMenuItems({
  kit,
  document,
  folders,
  actions,
}: {
  kit: MenuKit;
  document: DocumentSummaryDto;
  folders: readonly FolderDto[];
  actions: DocumentActions;
}) {
  const { Item, Separator, Sub, SubTrigger, SubContent } = kit;
  return (
    <>
      <Item onSelect={() => actions.open(document)}>
        <CornerDownLeft />
        Abrir
      </Item>
      <Item onSelect={() => actions.rename(document)}>
        <PenLine />
        Cambiar nombre…
      </Item>
      <Item onSelect={() => actions.duplicate(document)}>
        <Copy />
        Duplicar
      </Item>
      <Sub>
        <SubTrigger>
          <FolderInput />
          Mover a
        </SubTrigger>
        <SubContent className="max-h-72 min-w-44">
          <Item
            disabled={document.folderId === null}
            onSelect={() => actions.move(document, null)}
          >
            <FolderMinus />
            Fuera de las carpetas
          </Item>
          {folders.length > 0 ? <Separator /> : null}
          {folders.map((folder) => (
            <Item
              key={folder.id}
              disabled={document.folderId === folder.id}
              onSelect={() => actions.move(document, folder.id)}
            >
              <Folder />
              <span className="truncate">{folder.name}</span>
            </Item>
          ))}
        </SubContent>
      </Sub>
      <Separator />
      <Item variant="destructive" onSelect={() => actions.remove(document)}>
        <Trash2 />
        Eliminar…
      </Item>
    </>
  );
}
