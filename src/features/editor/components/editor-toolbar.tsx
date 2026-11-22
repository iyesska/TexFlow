"use client";

import type { StateCommand } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import {
  Bold,
  Code,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Sigma,
  SquareCode,
  Table,
  TextQuote,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useRef } from "react";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SHORTCUTS } from "@/config/shortcuts";
import { ASSET_TYPES } from "@/features/assets/model/asset";
import type { KeyCombo } from "@/lib/keyboard";

import {
  BLOCK_TEMPLATES,
  insertBlock,
  insertLink,
  toggleBlockquote,
  toggleBold,
  toggleBulletList,
  toggleHeading,
  toggleInlineCode,
  toggleItalic,
  toggleOrderedList,
} from "../codemirror/commands";

interface ToolbarAction {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly command: StateCommand;
  readonly shortcut?: KeyCombo;
}

const { format } = SHORTCUTS;

const HEADINGS: readonly ToolbarAction[] = [
  { label: "Título", icon: Heading1, command: toggleHeading(1) },
  { label: "Sección", icon: Heading2, command: toggleHeading(2) },
  { label: "Subsección", icon: Heading3, command: toggleHeading(3) },
];

/** Toolbar buttons, in groups separated by a divider. */
const GROUPS: readonly (readonly ToolbarAction[])[] = [
  [
    { label: "Negrita", icon: Bold, command: toggleBold, shortcut: format.bold },
    { label: "Cursiva", icon: Italic, command: toggleItalic, shortcut: format.italic },
    {
      label: "Código en línea",
      icon: Code,
      command: toggleInlineCode,
      shortcut: format.inlineCode,
    },
    { label: "Enlace", icon: Link2, command: insertLink, shortcut: format.link },
  ],
  [
    {
      label: "Lista",
      icon: List,
      command: toggleBulletList,
      shortcut: format.bulletList,
    },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      command: toggleOrderedList,
      shortcut: format.orderedList,
    },
    {
      label: "Cita",
      icon: TextQuote,
      command: toggleBlockquote,
      shortcut: format.blockquote,
    },
  ],
  [
    { label: "Tabla", icon: Table, command: insertBlock(BLOCK_TEMPLATES.table) },
    {
      label: "Bloque de código",
      icon: SquareCode,
      command: insertBlock(BLOCK_TEMPLATES.codeBlock),
    },
    {
      label: "Fórmula en bloque",
      icon: Sigma,
      command: insertBlock(BLOCK_TEMPLATES.mathBlock),
    },
  ],
];

/** Keeps the editor's selection when a toolbar control is pressed with the mouse. */
const keepEditorFocus = (event: React.MouseEvent) => event.preventDefault();

function ToolbarButton({
  action,
  disabled,
  onRun,
}: {
  action: ToolbarAction;
  disabled: boolean;
  onRun: (command: StateCommand) => void;
}) {
  const { label, icon: Icon, command, shortcut } = action;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onMouseDown={keepEditorFocus}
          onClick={() => onRun(command)}
          className="shrink-0 text-muted-foreground"
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
        {shortcut ? <ShortcutKeys combo={shortcut} /> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function HeadingMenu({
  disabled,
  onRun,
}: {
  disabled: boolean;
  onRun: (command: StateCommand) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Encabezado"
          disabled={disabled}
          className="shrink-0 text-muted-foreground"
        >
          <Heading />
        </Button>
      </DropdownMenuTrigger>
      {/* Returning focus to the button would take it away from the editor. */}
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {HEADINGS.map(({ label, icon: Icon, command }) => (
          <DropdownMenuItem key={label} onSelect={() => onRun(command)}>
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ACCEPTED_IMAGES = Object.keys(ASSET_TYPES).join(",");

/** Opens the file picker; the chosen images are added to the document. */
function ImageButton({
  disabled,
  onPicked,
}: {
  disabled: boolean;
  onPicked: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Imagen"
            disabled={disabled}
            onMouseDown={keepEditorFocus}
            onClick={() => inputRef.current?.click()}
            className="shrink-0 text-muted-foreground"
          >
            <ImageIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Añadir una imagen PNG o JPEG
        </TooltipContent>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        multiple
        hidden
        aria-label="Elegir imágenes"
        onChange={(event) => {
          onPicked(Array.from(event.target.files ?? []));
          // Lets the same file be picked again later.
          event.target.value = "";
        }}
      />
    </>
  );
}

/** Formatting controls for people who would rather click than remember Markdown. */
export function EditorToolbar({
  view,
  onImagesPicked,
}: {
  view: EditorView | null;
  onImagesPicked: (files: File[]) => void;
}) {
  const run = (command: StateCommand) => {
    if (!view) return;
    command(view);
    view.focus();
  };
  const disabled = view === null;

  return (
    <div
      role="toolbar"
      aria-label="Formato"
      className="no-scrollbar flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b px-2"
    >
      <HeadingMenu disabled={disabled} onRun={run} />
      {GROUPS.map((group, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <Separator orientation="vertical" className="mx-1 h-4! shrink-0" />
          ) : null}
          {group.map((action) => (
            <ToolbarButton
              key={action.label}
              action={action}
              disabled={disabled}
              onRun={run}
            />
          ))}
        </Fragment>
      ))}
      <ImageButton disabled={disabled} onPicked={onImagesPicked} />
    </div>
  );
}
