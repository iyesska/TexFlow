"use client";

import { MoveHorizontal, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { zoomInFrom, zoomLabel, zoomOutFrom, type ZoomSetting } from "../model/zoom";

function ToolbarButton({
  label,
  icon: Icon,
  disabled,
  pressed,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  pressed?: boolean;
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
          className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** Zoom controls for the preview. */
export function PreviewToolbar({
  scale,
  isFitted,
  onZoomChange,
}: {
  /** The scale currently applied, whether fitted or fixed. */
  scale: number;
  isFitted: boolean;
  onZoomChange: (zoom: ZoomSetting) => void;
}) {
  const zoomIn = zoomInFrom(scale);
  const zoomOut = zoomOutFrom(scale);

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b pr-1.5 pl-3">
      <span className="truncate text-muted-foreground">Vista rápida</span>
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
