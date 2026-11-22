"use client";

import {
  BookMarked,
  Columns3,
  History,
  Keyboard,
  LayoutTemplate,
  ListChecks,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { toast } from "sonner";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { isTheme, type Theme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SHORTCUTS } from "@/config/shortcuts";
import { useFirstSteps } from "@/features/onboarding/hooks/use-first-steps";
import { useMediaQuery } from "@/hooks/use-media-query";

import { useWorkspaceLayout } from "../hooks/use-workspace-layout";
import { useOpenPanel, type WorkspacePanel } from "../hooks/use-workspace-panels";

const THEME_LABELS: Readonly<Record<Theme, string>> = {
  dark: "Oscuro",
  light: "Claro",
  system: "Como el sistema",
};

/** Appearance and layout settings for the whole workspace. */
export function WorkspaceMenu() {
  const { theme, setTheme } = useTheme();
  const { dispatch } = useWorkspaceLayout();
  const openPanel = useOpenPanel();
  const { store: firstSteps } = useFirstSteps();
  /** A panel chosen in the menu, opened once the menu has closed and let go of focus. */
  const chosenPanel = useRef<WorkspacePanel | null>(null);
  /** On a phone the top bar keeps only a few buttons; the rest are here. */
  const isPhone = useMediaQuery("(max-width: 639px)", false);

  const resetLayout = () => {
    dispatch({ type: "reset" });
    toast.success("Diseño restablecido");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ajustes de vista"
          className="text-muted-foreground"
        >
          <SlidersHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        onCloseAutoFocus={(event) => {
          const panel = chosenPanel.current;
          chosenPanel.current = null;
          if (!panel) return;
          event.preventDefault();
          openPanel(panel);
        }}
      >
        {isPhone ? (
          <>
            <DropdownMenuItem onSelect={() => (chosenPanel.current = "design")}>
              <LayoutTemplate />
              Diseño del documento
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => (chosenPanel.current = "references")}>
              <BookMarked />
              Referencias
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => (chosenPanel.current = "history")}>
              <History />
              Historial de versiones
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
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
        <DropdownMenuItem onSelect={() => dispatch({ type: "showAll" })}>
          <Columns3 />
          Mostrar los tres paneles
          <DropdownMenuShortcut>
            <ShortcutKeys combo={SHORTCUTS.showAllPanes} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={resetLayout}>
          <RotateCcw />
          Restablecer diseño
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => (chosenPanel.current = "commands")}>
          <Search />
          Buscar una acción
          <DropdownMenuShortcut>
            <ShortcutKeys combo={SHORTCUTS.commandPalette} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => (chosenPanel.current = "shortcuts")}>
          <Keyboard />
          Atajos de teclado
          <DropdownMenuShortcut>
            <Kbd>?</Kbd>
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            firstSteps.show();
            chosenPanel.current = "guide";
          }}
        >
          <ListChecks />
          Primeros pasos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
