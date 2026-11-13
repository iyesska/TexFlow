"use client";

import {
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PreviewMode } from "@/features/compilation/hooks/use-compilation";
import type { KeyCombo } from "@/lib/keyboard";

import { zoomInFrom, zoomLabel, zoomOutFrom, type ZoomSetting } from "../model/zoom";

function ToolbarButton({
  label,
  icon: Icon,
  disabled,
  pressed,
  shortcut,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  pressed?: boolean;
  shortcut?: KeyCombo;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          className="shrink-0 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
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

export interface PageNavigation {
  readonly current: number;
  readonly count: number;
  goTo(page: number): void;
}

interface PreviewToolbarProps {
  readonly mode: PreviewMode;
  readonly onModeChange: (mode: PreviewMode) => void;
  /** The scale currently applied, whether fitted or fixed. */
  readonly scale: number;
  readonly isFitted: boolean;
  readonly onZoomChange: (zoom: ZoomSetting) => void;
  /** Present while a PDF with pages is on screen. */
  readonly pages?: PageNavigation;
}

/** Chooses between the quick preview and the PDF, and controls zoom and pages. */
export function PreviewToolbar({
  mode,
  onModeChange,
  scale,
  isFitted,
  onZoomChange,
  pages,
}: PreviewToolbarProps) {
  const zoomIn = zoomInFrom(scale);
  const zoomOut = zoomOutFrom(scale);

  return (
    <div className="no-scrollbar flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b pr-1.5 pl-2">
      <ToggleGroup
        type="single"
        size="sm"
        spacing={0.5}
        aria-label="Tipo de vista previa"
        value={mode}
        onValueChange={(value) => {
          if (value === "quick" || value === "pdf") onModeChange(value);
        }}
      >
        <ToggleGroupItem value="quick">Vista rápida</ToggleGroupItem>
        <ToggleGroupItem value="pdf">PDF</ToggleGroupItem>
      </ToggleGroup>

      {pages ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolbarButton
            label="Página anterior"
            icon={ChevronLeft}
            disabled={pages.current <= 1}
            onClick={() => pages.goTo(pages.current - 1)}
          />
          <output
            aria-label="Página"
            className="min-w-14 text-center text-xs whitespace-nowrap text-muted-foreground tabular-nums"
          >
            {pages.current} de {pages.count}
          </output>
          <ToolbarButton
            label="Página siguiente"
            icon={ChevronRight}
            disabled={pages.current >= pages.count}
            onClick={() => pages.goTo(pages.current + 1)}
          />
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <ToolbarButton
          label="Alejar"
          icon={ZoomOut}
          disabled={zoomOut === undefined}
          onClick={() => zoomOut !== undefined && onZoomChange(zoomOut)}
        />
        <output
          aria-label="Zoom"
          className="min-w-12 text-center text-xs text-muted-foreground tabular-nums"
        >
          {zoomLabel(scale)}
        </output>
        <ToolbarButton
          label="Acercar"
          icon={ZoomIn}
          disabled={zoomIn === undefined}
          onClick={() => zoomIn !== undefined && onZoomChange(zoomIn)}
        />
        <ToolbarButton
          label="Ajustar al ancho"
          icon={MoveHorizontal}
          pressed={isFitted}
          onClick={() => onZoomChange("fit")}
        />
      </div>
    </div>
  );
}
