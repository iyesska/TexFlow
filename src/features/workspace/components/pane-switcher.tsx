"use client";

import { ShortcutKeys } from "@/components/shortcut-keys";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SHORTCUTS } from "@/config/shortcuts";
import { cn } from "@/lib/utils";

import { useWorkspaceLayout } from "../hooks/use-workspace-layout";
import type { LayoutAction, PaneId, WorkspaceLayout } from "../model/layout";
import { PANE_META } from "./pane-meta";

interface PaneSwitcherProps {
  /**
   * In a split view each button shows or hides its pane. On a narrow screen the
   * buttons switch between panes, one at a time.
   */
  readonly splitView: boolean;
  readonly className?: string;
}

function isPressed(layout: WorkspaceLayout, pane: PaneId, splitView: boolean): boolean {
  return splitView ? layout.visible.includes(pane) : layout.active === pane;
}

function actionFor(pane: PaneId, splitView: boolean): LayoutAction {
  return splitView ? { type: "toggle", pane } : { type: "activate", pane };
}

function tooltipFor(label: string, pressed: boolean, splitView: boolean): string {
  if (!splitView) return `Ver ${label}`;
  return pressed ? `Ocultar ${label}` : `Mostrar ${label}`;
}

export function PaneSwitcher({ splitView, className }: PaneSwitcherProps) {
  const { layout, dispatch } = useWorkspaceLayout();

  return (
    <div
      role="group"
      aria-label="Paneles"
      className={cn(
        "grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg border bg-surface p-0.5",
        className,
      )}
    >
      {layout.order.map((pane) => {
        const { label, icon: Icon } = PANE_META[pane];
        const pressed = isPressed(layout, pane, splitView);
        return (
          <Tooltip key={pane}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => dispatch(actionFor(pane, splitView))}
                className={cn(
                  "flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 font-medium whitespace-nowrap transition-colors duration-150 outline-none",
                  "text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70",
                  "aria-pressed:bg-muted aria-pressed:text-foreground aria-pressed:shadow-[inset_0_0_0_1px_var(--border)]",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {tooltipFor(label, pressed, splitView)}
              <ShortcutKeys combo={SHORTCUTS.togglePane[pane]} />
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
