"use client";

import { useId, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** A group of settings under a heading. */
export function DesignSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3.5">
      <h3 id={id} className="text-sm font-medium text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A labelled control with an optional hint underneath. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (ids: { labelId: string; controlId: string }) => ReactNode;
}) {
  const labelId = useId();
  const controlId = useId();
  return (
    <div className="space-y-1.5">
      <Label
        id={labelId}
        htmlFor={controlId}
        className="text-xs font-normal text-muted-foreground"
      >
        {label}
      </Label>
      {children({ labelId, controlId })}
      {hint ? <p className="text-xs text-faint-foreground">{hint}</p> : null}
    </div>
  );
}

/** A row of mutually exclusive options; one is always chosen. */
export function Segmented<Value extends string | number>({
  labelledBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      spacing={0.5}
      aria-labelledby={labelledBy}
      value={String(value)}
      // Radix reports "" when the chosen option is pressed again: keep it chosen.
      onValueChange={(next) => {
        const option = options.find((candidate) => String(candidate.value) === next);
        if (option) onChange(option.value);
      }}
      className="grid w-full auto-cols-fr grid-flow-col rounded-lg border bg-background p-0.5"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={String(option.value)}
          value={String(option.value)}
          className="w-full px-1.5 text-xs"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * A whole number of millimetres. The value is committed when the field is left or
 * Enter is pressed; `onCommit` returns why a value was refused, or null.
 */
export function MillimetreInput({
  id,
  label,
  value,
  min,
  max,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => string | null;
}) {
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const parsed = Math.round(Number(draft.replace(",", ".")));
    if (!Number.isFinite(parsed) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    const refusal = clamped === value ? null : onCommit(clamped);
    setDraft(String(refusal ? value : clamped));
  };

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
          className="h-8 pr-9 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-faint-foreground">
          mm
        </span>
      </div>
    </div>
  );
}
