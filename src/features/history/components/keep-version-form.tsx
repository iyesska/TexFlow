"use client";

import { BookmarkPlus, LoaderCircle } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VERSION_LABEL_MAX_LENGTH, type VersionSummaryDto } from "@/contracts/documents";

import type { KeepOutcome } from "../hooks/use-version-actions";

export interface KeepVersionFormProps {
  onKeep(label: string): Promise<KeepOutcome>;
  onKept(version: VersionSummaryDto): void;
}

/** "Guardar versión": keeps the document as it is now, under a name the writer gives. */
export function KeepVersionForm({ onKeep, onKept }: KeepVersionFormProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = label.trim();
    if (!name) {
      setError("Escribe un nombre para la versión.");
      return;
    }
    setPending(true);
    const outcome = await onKeep(name);
    setPending(false);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    setOpen(false);
    setLabel("");
    onKept(outcome.version);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        setError(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="w-full justify-start">
          <BookmarkPlus />
          Guardar esta versión
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <form onSubmit={submit} className="grid gap-3" noValidate>
          <div className="grid gap-1">
            <Label htmlFor={id} className="text-ui">
              Nombre de la versión
            </Label>
            <p className="text-xs text-muted-foreground">
              Se guarda el documento tal como está ahora. Las versiones con nombre no se
              borran solas.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Input
              id={id}
              value={label}
              maxLength={VERSION_LABEL_MAX_LENGTH}
              placeholder="Por ejemplo, Entrega al tutor"
              autoComplete="off"
              onChange={(event) => {
                setLabel(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="h-8"
            />
            {error ? (
              <p id={`${id}-error`} className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              Guardar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
