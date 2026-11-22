"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface NameDialogProps {
  readonly title: string;
  readonly description?: string;
  readonly label: string;
  readonly initialValue: string;
  readonly submitLabel: string;
  readonly maxLength: number;
  /** An empty name is allowed only when it means something, like "follow the text". */
  readonly allowEmpty?: boolean;
  readonly placeholder?: string;
  /** Saves the name; resolves to why it could not be saved, or null. */
  onSubmit(name: string): Promise<string | null>;
  onClose(): void;
}

/** Asks for a name: a new folder, or a new name for a document or a folder. */
export function NameDialog(props: NameDialogProps) {
  const { title, description, label, initialValue, submitLabel, maxLength } = props;
  const id = useId();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = value.trim();
    if (!name && !props.allowEmpty) {
      setError("Escribe un nombre.");
      return;
    }
    setPending(true);
    const failure = await props.onSubmit(name);
    setPending(false);
    if (failure) setError(failure);
    else props.onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor={id} className="text-ui">
              {label}
            </Label>
            <Input
              id={id}
              value={value}
              maxLength={maxLength}
              placeholder={props.placeholder}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="h-9"
            />
            {error ? (
              <p id={`${id}-error`} className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
