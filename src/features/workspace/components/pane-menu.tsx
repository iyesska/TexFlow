"use client";

import { ArrowLeft, ArrowRight, Ellipsis, EyeOff, Maximize2 } from "lucide-react";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SHORTCUTS } from "@/config/shortcuts";

import { useWorkspaceLayout } from "../hooks/use-workspace-layout";
import { neighbourOf, type PaneId } from "../model/layout";
import { PANE_META } from "./pane-meta";

/** Per-pane actions: reorder, focus on one pane, hide. */
export function PaneMenu({ pane }: { pane: PaneId }) {
  const { layout, dispatch } = useWorkspaceLayout();
  const isOnlyPane = layout.visible.length === 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Opciones del panel ${PANE_META[pane].label}`}
          className="text-muted-foreground"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          disabled={neighbourOf(layout, pane, "left") === undefined}
          onSelect={() => dispatch({ type: "move", pane, direction: "left" })}
        >
          <ArrowLeft />
          Mover a la izquierda
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={neighbourOf(layout, pane, "right") === undefined}
          onSelect={() => dispatch({ type: "move", pane, direction: "right" })}
        >
          <ArrowRight />
          Mover a la derecha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isOnlyPane}
          onSelect={() => dispatch({ type: "solo", pane })}
        >
          <Maximize2 />
          Ver solo este panel
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isOnlyPane}
          onSelect={() => dispatch({ type: "toggle", pane })}
        >
          <EyeOff />
          Ocultar panel
          <DropdownMenuShortcut>
            <ShortcutKeys combo={SHORTCUTS.togglePane[pane]} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
