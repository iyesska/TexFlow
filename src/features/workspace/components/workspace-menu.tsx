"use client";

import { Columns3, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { isTheme, type Theme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
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

import { useWorkspaceLayout } from "../hooks/use-workspace-layout";

const THEME_LABELS: Readonly<Record<Theme, string>> = {
  dark: "Oscuro",
  light: "Claro",
  system: "Como el sistema",
};

/** Appearance and layout settings for the whole workspace. */
export function WorkspaceMenu() {
  const { theme, setTheme } = useTheme();
  const { dispatch } = useWorkspaceLayout();

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
      <DropdownMenuContent align="end" className="w-64">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
