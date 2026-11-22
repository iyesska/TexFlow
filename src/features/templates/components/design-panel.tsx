"use client";

import { LayoutTemplate, RotateCcw } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePanel } from "@/features/workspace/hooks/use-workspace-panels";
import { templateById } from "@/templates/catalog";

import { useDesign } from "../hooks/use-design";
import { DesignSection } from "./design-fields";
import { DesignSettings } from "./design-settings";
import { TemplateGallery } from "./template-gallery";

/**
 * The document's design: the template library and every setting, in a side panel.
 * The panel is not modal, so the preview stays in view and follows each change.
 */
export function DesignPanel() {
  const design = useDesign();
  const galleryLabelId = useId();
  const template = templateById(design.settings.templateId);
  const [open, setOpen] = usePanel("design");

  return (
    <Sheet modal={false} open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Diseño del documento"
              // On a phone the view menu opens it: the top bar has no room.
              className="text-muted-foreground max-sm:hidden"
            >
              <LayoutTemplate />
              <span className="hidden md:inline">Diseño</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Plantilla: {template.name}
        </TooltipContent>
      </Tooltip>

      <SheetContent
        side="left"
        // The panel stays open while the writer edits or scrolls the preview.
        onInteractOutside={(event) => event.preventDefault()}
        className="w-full gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b px-4 pt-4 pb-3.5">
          <SheetTitle className="text-sm">Diseño del documento</SheetTitle>
          <SheetDescription className="text-xs">
            La plantilla y los ajustes cambian el aspecto, nunca el texto.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-5">
          <DesignSection title="Plantilla">
            <span id={galleryLabelId} className="sr-only">
              Plantilla
            </span>
            <TemplateGallery
              value={design.settings.templateId}
              onChange={design.applyTemplate}
              labelledBy={galleryLabelId}
            />
          </DesignSection>
          <DesignSettings design={design} />
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {design.isCustomized
              ? `${template.name}, con ajustes propios`
              : `Ajustes de ${template.name}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={!design.isCustomized}
            onClick={design.reset}
          >
            <RotateCcw />
            Restablecer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
