"use client";

import { Search } from "lucide-react";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { Button } from "@/components/ui/button";
import { SHORTCUTS } from "@/config/shortcuts";
import { useOpenPanel } from "@/features/workspace/hooks/use-workspace-panels";

/** Opens the command palette, and shows how to open it from the keyboard. */
export function CommandButton() {
  const openPanel = useOpenPanel();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openPanel("commands")}
      aria-label="Buscar una acción"
      aria-keyshortcuts="Control+K Meta+K"
      className="hidden gap-2 bg-transparent text-muted-foreground lg:inline-flex 2xl:pr-1.5"
    >
      <Search />
      <span className="hidden min-[1800px]:inline">Buscar</span>
      <ShortcutKeys combo={SHORTCUTS.commandPalette} className="hidden 2xl:inline-flex" />
    </Button>
  );
}
