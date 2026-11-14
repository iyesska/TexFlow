"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { site } from "@/config/site";
import { TITLE_MAX_LENGTH } from "@/contracts/documents";

import { useDocumentSession, useDocumentTitle } from "../hooks/use-document";

/**
 * The document's name. It follows the text's first heading until the writer names the
 * document here; clearing the name lets it follow the heading again.
 */
export function DocumentTitle() {
  const session = useDocumentSession();
  const title = useDocumentTitle();
  const [draft, setDraft] = useState<string | null>(null);
  // Naming the document moves the keyboard to the name, as the click asked.
  const focusOnMount = useCallback(
    (input: HTMLInputElement | null) => input?.focus(),
    [],
  );

  // The browser tab follows the title as it changes, like the bar does.
  useEffect(() => {
    window.document.title = `${title} — ${site.name}`;
  }, [title]);

  const commit = async () => {
    if (draft === null) return;
    const name = draft.trim();
    setDraft(null);
    if (name === title) return;
    const outcome = await session.rename(name || null);
    if (!outcome.ok)
      toast.error("No se pudo cambiar el nombre", { description: outcome.message });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft(null);
    }
  };

  if (draft !== null) {
    return (
      <Input
        aria-label="Nombre del documento"
        value={draft}
        maxLength={TITLE_MAX_LENGTH}
        placeholder="El primer título del texto"
        ref={focusOnMount}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => void commit()}
        className="h-7 w-56 min-w-0 px-2 text-ui font-medium md:w-72"
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setDraft(title)}
          className="-mx-1.5 min-w-0 truncate rounded-md px-1.5 py-0.5 text-left text-ui font-medium transition-colors duration-(--duration-fast) hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {title}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        Cambiar el nombre
      </TooltipContent>
    </Tooltip>
  );
}
