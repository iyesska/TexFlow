"use client";

import { History } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditorSessionCache } from "@/features/editor/hooks/use-editor-session-cache";
import { usePanel } from "@/features/workspace/hooks/use-workspace-panels";

import { VersionBrowser } from "./version-browser";

/** The "Historial" button of the workspace, and the history it opens. */
export function HistoryPanel() {
  const [open, setOpen] = usePanel("history");
  const editor = useEditorSessionCache();
  const restored = useRef(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Historial de versiones"
              // On a phone the view menu opens it: the top bar has no room.
              className="text-muted-foreground max-sm:hidden"
            >
              <History />
              <span className="hidden min-[1680px]:inline">Historial</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Historial de versiones
        </TooltipContent>
      </Tooltip>

      <DialogContent
        className="flex h-[min(44rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        onCloseAutoFocus={(event) => {
          if (!restored.current) return;
          restored.current = false;
          // After a restore the writer goes back to the text, not to the button.
          if (editor.focus()) event.preventDefault();
        }}
      >
        <DialogHeader className="gap-1 border-b px-4 pt-4 pr-12 pb-3">
          <DialogTitle className="text-sm">Historial de versiones</DialogTitle>
          <DialogDescription className="text-xs">
            Compara una versión con el texto actual y restáurala si la necesitas. Nada se
            pierde: antes de restaurar se guarda lo que hay ahora.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: each opening reads the history afresh. */}
        {open ? (
          <VersionBrowser
            onRestored={() => {
              restored.current = true;
              setOpen(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
