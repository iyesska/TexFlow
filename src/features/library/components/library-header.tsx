"use client";

import { ChevronDown, LoaderCircle, Plus, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { isTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { AccountMenu } from "@/features/account/components/account-menu";
import type { AccountUser } from "@/features/account/model/account";
import { TemplateThumbnail } from "@/features/templates/components/template-thumbnail";
import { TEMPLATES, templateSettings } from "@/templates/catalog";
import type { TemplateId } from "@/templates/settings";

const THEME_LABELS = {
  dark: "Oscuro",
  light: "Claro",
  system: "Como el sistema",
} as const;

/** Whether a key press is someone typing, which shortcuts must leave alone. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function SearchField({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  // "/" jumps to the search, as in most tools that list things.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint-foreground"
        aria-hidden
      />
      <Input
        ref={input}
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onQueryChange("");
            event.currentTarget.blur();
          }
        }}
        placeholder="Buscar documentos"
        aria-label="Buscar documentos por título"
        className="h-8 pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      <Kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">
        /
      </Kbd>
    </div>
  );
}

/** "New document", and from its arrow, a new document in a chosen template. */
function NewDocumentButton({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: (templateId?: TemplateId) => void;
}) {
  return (
    <div className="flex shrink-0">
      <Button onClick={() => onCreate()} disabled={creating} className="rounded-r-none">
        {creating ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus />}
        <span className="hidden sm:inline">Nuevo documento</span>
        <span className="sm:hidden">Nuevo</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            disabled={creating}
            aria-label="Nuevo documento con una plantilla"
            className="rounded-l-none border-l border-l-highlight-foreground/15"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Empezar con una plantilla</DropdownMenuLabel>
          {TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onSelect={() => onCreate(template.id)}
              className="items-start gap-3 py-2"
            >
              <TemplateThumbnail
                settings={templateSettings(template.id)}
                structure={template.structure}
                className="w-7"
              />
              <span className="grid gap-0.5">
                <span className="text-ui font-medium">{template.name}</span>
                <span className="text-xs text-pretty text-muted-foreground">
                  {template.description}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ThemeItems() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <DropdownMenuLabel>Tema</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={theme}
        onValueChange={(value) => {
          if (isTheme(value)) setTheme(value);
        }}
      >
        {Object.entries(THEME_LABELS).map(([value, label]) => (
          <DropdownMenuRadioItem key={value} value={value}>
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
    </>
  );
}

export function LibraryHeader({
  user,
  query,
  onQueryChange,
  creating,
  onCreate,
}: {
  user: AccountUser;
  query: string;
  onQueryChange: (query: string) => void;
  creating: boolean;
  onCreate: (templateId?: TemplateId) => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:gap-4 sm:px-6">
      <Wordmark className="shrink-0" />
      <div className="flex min-w-0 flex-1 justify-center">
        <SearchField query={query} onQueryChange={onQueryChange} />
      </div>
      <NewDocumentButton creating={creating} onCreate={onCreate} />
      <AccountMenu user={user}>
        <ThemeItems />
      </AccountMenu>
    </header>
  );
}
