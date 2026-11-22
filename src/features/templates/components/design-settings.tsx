"use client";

import { useId, useState, type ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CITATION_STYLES,
  COVER_STYLES,
  FONT_SIZES,
  FONTS,
  FOOTER_STYLES,
  HEADER_STYLES,
  LANGUAGES,
  LINE_SPACINGS,
  MARGIN_LIMITS,
  PAPER_SIZES,
  type CitationStyle,
  type DocumentSettings,
  type FontId,
  type FooterStyle,
  type HeaderStyle,
  type PaperSize,
} from "@/templates/settings";

import type { Design } from "../hooks/use-design";
import {
  CITATION_STYLE_LABELS,
  COVER_LABELS,
  FONT_LABELS,
  FOOTER_LABELS,
  HEADER_LABELS,
  LANGUAGE_LABELS,
  LINE_SPACING_LABELS,
} from "../model/labels";
import { FONT_STACKS } from "../model/preview-style";
import { DesignSection, Field, MillimetreInput, Segmented } from "./design-fields";

const PAPER_OPTIONS = (Object.keys(PAPER_SIZES) as PaperSize[]).map((value) => ({
  value,
  label: PAPER_SIZES[value].label,
}));

const MARGIN_FIELDS = [
  { side: "top", label: "Superior" },
  { side: "bottom", label: "Inferior" },
  { side: "left", label: "Izquierdo" },
  { side: "right", label: "Derecho" },
] as const;

function Margins({ design }: { design: Design }) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const baseId = useId();
  const { margins } = design.settings;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {MARGIN_FIELDS.map(({ side, label }) => (
          <MillimetreInput
            // A value changed from elsewhere (a template) starts the field afresh.
            key={`${side}-${margins[side]}`}
            id={`${baseId}-${side}`}
            label={label}
            value={margins[side]}
            min={MARGIN_LIMITS.min}
            max={MARGIN_LIMITS.max}
            onCommit={(value) => {
              const result = design.update({ margins: { ...margins, [side]: value } });
              setRefusal(result);
              return result;
            }}
          />
        ))}
      </div>
      {refusal ? (
        <p role="alert" className="text-xs text-destructive">
          {refusal}
        </p>
      ) : (
        <p className="text-xs text-faint-foreground">
          Entre {MARGIN_LIMITS.min} y {MARGIN_LIMITS.max} mm.
        </p>
      )}
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm text-foreground">{label}</span>
        {hint ? (
          <span id={hintId} className="mt-0.5 block text-xs text-faint-foreground">
            {hint}
          </span>
        ) : null}
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        {...(hint ? { "aria-describedby": hintId } : {})}
        className="mt-0.5"
      />
    </div>
  );
}

/** A choice among named options, shown as a menu. */
function OptionSelect<Value extends string>({
  ids,
  value,
  options,
  labels,
  onChange,
}: {
  ids: { labelId: string; controlId: string };
  value: Value;
  options: readonly Value[];
  labels: Readonly<Record<Value, ReactNode>>;
  onChange: (value: Value) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate === next);
        if (option) onChange(option);
      }}
    >
      <SelectTrigger
        id={ids.controlId}
        aria-labelledby={ids.labelId}
        size="sm"
        className="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {labels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Each typeface's name, set in that typeface. */
const FONT_NAMES = Object.fromEntries(
  FONTS.map((font) => [
    font,
    <span key={font} style={{ fontFamily: FONT_STACKS[font] }}>
      {FONT_LABELS[font].name}
    </span>,
  ]),
) as Record<FontId, ReactNode>;

const CITATION_STYLE_NAMES = Object.fromEntries(
  CITATION_STYLES.map((style) => [style, CITATION_STYLE_LABELS[style].name]),
) as Record<CitationStyle, string>;

/** Every design setting of the document, grouped as a typesetter would think of them. */
export function DesignSettings({ design }: { design: Design }) {
  const { settings, update } = design;
  const set = (patch: Partial<DocumentSettings>) => void update(patch);

  return (
    <div className="space-y-7">
      <DesignSection title="Página">
        <Field label="Tamaño del papel">
          {({ labelId }) => (
            <Segmented
              labelledBy={labelId}
              options={PAPER_OPTIONS}
              value={settings.paperSize}
              onChange={(paperSize) => {
                const refusal = update({ paperSize });
                // A smaller sheet can leave too little room inside the current margins.
                if (refusal)
                  update({
                    paperSize,
                    margins: { top: 20, bottom: 20, left: 20, right: 20 },
                  });
              }}
            />
          )}
        </Field>
        <Margins design={design} />
      </DesignSection>

      <DesignSection title="Texto">
        <Field label="Tipografía" hint={FONT_LABELS[settings.font].hint}>
          {(ids) => (
            <OptionSelect<FontId>
              ids={ids}
              value={settings.font}
              options={FONTS}
              labels={FONT_NAMES}
              onChange={(font) => set({ font })}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cuerpo">
            {({ labelId }) => (
              <Segmented
                labelledBy={labelId}
                options={FONT_SIZES.map((value) => ({ value, label: `${value} pt` }))}
                value={settings.fontSize}
                onChange={(fontSize) => set({ fontSize })}
              />
            )}
          </Field>
          <Field label="Interlineado">
            {({ labelId }) => (
              <Segmented
                labelledBy={labelId}
                options={LINE_SPACINGS.map((value) => ({
                  value,
                  label: LINE_SPACING_LABELS[value],
                }))}
                value={settings.lineSpacing}
                onChange={(lineSpacing) => set({ lineSpacing })}
              />
            )}
          </Field>
        </div>
        <Field
          label="Idioma del documento"
          hint="Decide la división de palabras y rótulos como «Figura» o «Índice»."
        >
          {({ labelId }) => (
            <Segmented
              labelledBy={labelId}
              options={LANGUAGES.map((value) => ({
                value,
                label: LANGUAGE_LABELS[value],
              }))}
              value={settings.language}
              onChange={(language) => set({ language })}
            />
          )}
        </Field>
      </DesignSection>

      <DesignSection title="Cabecera y pie">
        <Field label="Cabecera">
          {(ids) => (
            <OptionSelect<HeaderStyle>
              ids={ids}
              value={settings.header}
              options={HEADER_STYLES}
              labels={HEADER_LABELS}
              onChange={(header) => set({ header })}
            />
          )}
        </Field>
        <Field label="Pie de página" hint="La cabecera y el pie se ven en la vista PDF.">
          {(ids) => (
            <OptionSelect<FooterStyle>
              ids={ids}
              value={settings.footer}
              options={FOOTER_STYLES}
              labels={FOOTER_LABELS}
              onChange={(footer) => set({ footer })}
            />
          )}
        </Field>
      </DesignSection>

      <DesignSection title="Estructura">
        <Field
          label="Título"
          hint="Usa el título, la autoría y la fecha de los metadatos del documento."
        >
          {({ labelId }) => (
            <Segmented
              labelledBy={labelId}
              options={COVER_STYLES.map((value) => ({
                value,
                label: COVER_LABELS[value],
              }))}
              value={settings.cover}
              onChange={(cover) => set({ cover })}
            />
          )}
        </Field>
        <SwitchRow
          label="Numerar las secciones"
          checked={settings.numberSections}
          onChange={(numberSections) => set({ numberSections })}
        />
        <SwitchRow
          label="Índice de contenidos"
          hint="Al principio del documento, tras el título."
          checked={settings.tableOfContents}
          onChange={(tableOfContents) => set({ tableOfContents })}
        />
      </DesignSection>

      <DesignSection title="Referencias">
        <Field
          label="Estilo de las citas"
          hint={`Una cita se escribe así: ${CITATION_STYLE_LABELS[settings.citationStyle].example}. Al cambiar de plantilla se mantiene.`}
        >
          {(ids) => (
            <OptionSelect<CitationStyle>
              ids={ids}
              value={settings.citationStyle}
              options={CITATION_STYLES}
              labels={CITATION_STYLE_NAMES}
              onChange={(citationStyle) => set({ citationStyle })}
            />
          )}
        </Field>
      </DesignSection>
    </div>
  );
}
