"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS } from "@/config/shortcuts";
import { useCompleteStep } from "@/features/onboarding/hooks/use-first-steps";
import { usePanel } from "@/features/workspace/hooks/use-workspace-panels";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import type { Command } from "../hooks/use-workspace-commands";

// The list and its search load the first time the palette opens.
const PaletteBody = dynamic(() =>
  import("./palette-body").then((module) => module.PaletteBody),
);

/**
 * Every action of the workspace behind one search box: Ctrl/Cmd+K, or Ctrl/Cmd+P
 * from inside the editor, where Ctrl/Cmd+K inserts a link.
 */
export function CommandPalette({ splitView }: { splitView: boolean }) {
  const [open, setOpen] = usePanel("commands");
  const completeStep = useCompleteStep();
  /** The command chosen, run once the palette has closed and handed focus back. */
  const chosen = useRef<Command | null>(null);
  /** Where the keyboard was before the palette took it: often the editor. */
  const before = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) completeStep("commands");
  }, [open, completeStep]);

  useKeyboardShortcuts([
    { combo: SHORTCUTS.commandPalette, run: () => setOpen(true), unlessHandled: true },
    { combo: SHORTCUTS.commandPaletteAnywhere, run: () => setOpen(true) },
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[max(1rem,12dvh)] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl data-open:slide-in-from-top-2"
        onOpenAutoFocus={() => {
          before.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          // Back where the keyboard was, and only then the command: one that moves
          // the focus itself, like opening a dialog, then keeps it.
          event.preventDefault();
          if (before.current?.isConnected) before.current.focus();
          before.current = null;
          const command = chosen.current;
          chosen.current = null;
          command?.run();
        }}
      >
        <DialogTitle className="sr-only">Acciones</DialogTitle>
        <DialogDescription className="sr-only">
          Escribe para buscar una acción y pulsa Intro para hacerla.
        </DialogDescription>
        {open ? (
          <PaletteBody
            splitView={splitView}
            onChoose={(command) => {
              chosen.current = command;
              setOpen(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
