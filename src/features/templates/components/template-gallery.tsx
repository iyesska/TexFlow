"use client";

import { Check } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { TEMPLATES, templateSettings } from "@/templates/catalog";
import { TEMPLATE_IDS, type TemplateId } from "@/templates/settings";

import { FONT_STACKS } from "../model/preview-style";
import { TemplateThumbnail } from "./template-thumbnail";

const isTemplateId = (value: string): value is TemplateId =>
  (TEMPLATE_IDS as readonly string[]).includes(value);

/** The template library, as a list of choices. Each name is set in its template's face. */
export function TemplateGallery({
  value,
  onChange,
  labelledBy,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  labelledBy: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(next) => {
        if (isTemplateId(next)) onChange(next);
      }}
      aria-labelledby={labelledBy}
      className="grid gap-1.5"
    >
      {TEMPLATES.map((template) => {
        const settings = templateSettings(template.id);
        return (
          <RadioGroupPrimitive.Item
            key={template.id}
            value={template.id}
            className="group flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors duration-150 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/70 data-[state=checked]:border-border-strong data-[state=checked]:bg-muted"
          >
            <TemplateThumbnail settings={settings} structure={template.structure} />
            <span className="min-w-0 flex-1">
              <span
                className="block text-sm leading-tight text-foreground"
                style={{ fontFamily: FONT_STACKS[settings.font] }}
              >
                {template.name}
              </span>
              <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                {template.description}
              </span>
            </span>
            <Check
              aria-hidden
              className="size-4 shrink-0 text-highlight opacity-0 transition-opacity duration-150 group-data-[state=checked]:opacity-100"
            />
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
