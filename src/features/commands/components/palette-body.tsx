"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

import { useWorkspaceCommands, type Command } from "../hooks/use-workspace-commands";
import { searchCommands } from "../model/search";

/** The commands as the list shows them: in groups, in the order found. */
function grouped(commands: readonly Command[]) {
  const groups = new Map<string, Command[]>();
  for (const command of commands) {
    const group = groups.get(command.group);
    if (group) group.push(command);
    else groups.set(command.group, [command]);
  }
  return [...groups];
}

export function PaletteBody({
  splitView,
  onChoose,
}: {
  splitView: boolean;
  onChoose: (command: Command) => void;
}) {
  const id = useId();
  const commands = useWorkspaceCommands(splitView);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // This part loads after the dialog opens, so the dialog cannot focus the box: it
  // takes the keyboard itself, and nothing typed meanwhile is lost.
  useEffect(() => inputRef.current?.focus(), []);

  const found = useMemo(() => searchCommands(commands, query), [commands, query]);
  // With a query the best match leads; without one, the groups keep their order.
  const groups = query.trim() ? [["Resultados", found] as const] : grouped(found);
  const ordered = groups.flatMap(([, items]) => items);
  const active = ordered.find((command) => command.id === activeId) ?? ordered[0] ?? null;
  const optionId = (command: Command) => `${id}-${command.id}`;

  const activate = (command: Command | undefined) => {
    if (!command) return;
    setActiveId(command.id);
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(command))}`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const handleKey = (event: KeyboardEvent) => {
    const index = active ? ordered.indexOf(active) : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activate(ordered[(index + 1) % ordered.length]);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activate(ordered[(index - 1 + ordered.length) % ordered.length]);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      onChoose(active);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2.5 border-b px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded
          aria-controls={`${id}-list`}
          aria-activedescendant={active ? optionId(active) : undefined}
          aria-autocomplete="list"
          aria-label="Busca una acción"
          placeholder="Busca una acción: exportar, plantilla, historial…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveId(null);
          }}
          onKeyDown={handleKey}
          className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint-foreground"
        />
        <Kbd className="hidden sm:inline-flex">Esc</Kbd>
      </div>

      <div
        ref={listRef}
        id={`${id}-list`}
        // aislop-ignore-next-line jsx-a11y/prefer-tag-over-role -- the ARIA listbox pattern: native select and option cannot hold this markup
        role="listbox"
        aria-label="Acciones"
        className="max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain p-1.5"
      >
        {ordered.length === 0 ? (
          <p className="px-3 py-8 text-center text-ui text-muted-foreground">
            Ninguna acción coincide con «{query.trim()}».
          </p>
        ) : null}
        {groups.map(([group, items]) => (
          // aislop-ignore-next-line jsx-a11y/prefer-tag-over-role -- groups of a listbox, labelled by their heading: fieldset does not belong in a listbox
          <div key={group} role="group" aria-labelledby={`${id}-${group}`}>
            <div
              id={`${id}-${group}`}
              className="px-2.5 pt-2.5 pb-1 text-2xs font-medium text-faint-foreground"
            >
              {group}
            </div>
            {items.map((command) => {
              const Icon = command.icon;
              const selected = command === active;
              return (
                // aislop-ignore-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus -- options of a listbox driven by aria-activedescendant: the keyboard acts on the listbox
                <div
                  key={command.id}
                  id={optionId(command)}
                  // aislop-ignore-next-line jsx-a11y/prefer-tag-over-role -- the ARIA listbox pattern: native select and option cannot hold this markup
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => {
                    if (!selected) setActiveId(command.id);
                  }}
                  onClick={() => onChoose(command)}
                  className={cn(
                    "flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-ui",
                    selected ? "bg-muted text-foreground" : "text-foreground/90",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      selected ? "text-foreground" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.hint ? (
                    <span className="text-2xs text-muted-foreground">{command.hint}</span>
                  ) : null}
                  {command.shortcut ? (
                    <ShortcutKeys
                      combo={command.shortcut}
                      className="hidden sm:inline-flex"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 border-t px-4 py-2 text-2xs text-muted-foreground max-sm:hidden">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          para moverte
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Intro</Kbd>
          para elegir
        </span>
      </div>
    </>
  );
}
