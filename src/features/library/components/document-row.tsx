"use client";

import { Ellipsis, Folder } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentSummaryDto, FolderDto } from "@/contracts/documents";
import { TemplateThumbnail } from "@/features/templates/components/template-thumbnail";
import { formatChangedAt } from "@/lib/relative-time";
import { templateById, templateSettings } from "@/templates/catalog";

import {
  CONTEXT_KIT,
  DocumentMenuItems,
  DROPDOWN_KIT,
  type DocumentActions,
} from "./document-menu";

const fullDate = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short" });

/** One document in the list: open it with a click, act on it from its menus. */
export function DocumentRow({
  document,
  folders,
  showFolder,
  now,
  actions,
}: {
  document: DocumentSummaryDto;
  folders: readonly FolderDto[];
  /** In "all documents", each row says where it lives. */
  showFolder: boolean;
  now: Date;
  actions: DocumentActions;
}) {
  const template = templateById(document.templateId);
  const folder = showFolder
    ? folders.find(({ id }) => id === document.folderId)
    : undefined;
  const menu = { document, folders, actions };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li className="group relative flex items-center gap-3.5 rounded-lg px-3 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60">
          <TemplateThumbnail
            settings={templateSettings(document.templateId)}
            structure={template.structure}
            className="w-8"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/documents/${document.id}`}
              className="block truncate text-sm font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {document.title}
            </Link>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{template.name}</span>
              {folder ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex min-w-0 items-center gap-1">
                    <Folder className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{folder.name}</span>
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <time
            dateTime={document.updatedAt}
            title={fullDate.format(new Date(document.updatedAt))}
            suppressHydrationWarning
            className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block"
          >
            {formatChangedAt(document.updatedAt, now)}
          </time>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones de «${document.title}»`}
                className="relative shrink-0 text-muted-foreground opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DocumentMenuItems kit={DROPDOWN_KIT} {...menu} />
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <DocumentMenuItems kit={CONTEXT_KIT} {...menu} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
