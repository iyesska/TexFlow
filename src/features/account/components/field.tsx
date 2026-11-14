"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps extends Omit<ComponentProps<"input">, "id"> {
  readonly label: string;
  readonly name: string;
  /** Shown under the field until there is an error to show instead. */
  readonly hint?: string;
  readonly error?: string | undefined;
}

/** A labelled input with its hint or error, wired for assistive technology. */
export function Field({ label, hint, error, className, ...input }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-ui">
        {label}
      </Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cn("h-9", className)}
        {...input}
      />
      {note ? (
        <p
          id={noteId}
          className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** A password field whose content can be shown, to check what was typed. */
export function PasswordField(props: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Field {...props} type={visible ? "text" : "password"} className="pr-9" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        aria-pressed={visible}
        className="absolute top-[1.625rem] right-1 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
