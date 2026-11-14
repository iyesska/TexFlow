"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BibEntry } from "@/documents/bibtex";
import {
  BIB_TYPES,
  joinAuthors,
  KEY_PATTERN,
  splitAuthors,
  suggestKey,
  type BibField,
  type BibType,
  type NewEntry,
} from "@/documents/bibtex-edit";

import { FIELD_LABELS, TYPE_FIELDS, TYPE_LABELS } from "../model/references";

type Values = Partial<Record<BibField, string>>;

const isBibType = (type: string): type is BibType =>
  (BIB_TYPES as readonly string[]).includes(type);

const HINTS: Partial<Record<BibField, string>> = {
  author: "Uno por línea, como «Apellido, Nombre». Una institución, entre llaves: {OMS}.",
  editor: "Uno por línea, como «Apellido, Nombre».",
  pages: "Como 12--34.",
  doi: "Sin «https://doi.org/», como 10.1000/xyz123.",
  urldate: "Como 2026-11-14.",
};

/**
 * Adds a reference, or edits one, from a form: the type decides which fields are
 * offered. The key is suggested from the authors, year and title until it is typed.
 */
export function ReferenceDialog({
  entry,
  initialKey,
  takenKeys,
  onSave,
  onClose,
}: {
  /** The entry to edit; none to add a new one. */
  entry?: BibEntry;
  /** For a new entry: the key the text already cites it by. */
  initialKey?: string;
  takenKeys: ReadonlySet<string>;
  onSave: (entry: NewEntry, extra: Readonly<Record<string, string>>) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [type, setType] = useState<BibType>(
    entry && isBibType(entry.type) ? entry.type : "article",
  );
  const [values, setValues] = useState<Values>(() => {
    if (!entry) return {};
    const fields: Values = { ...entry.fields };
    if (fields.author) fields.author = splitAuthors(fields.author);
    if (fields.editor) fields.editor = splitAuthors(fields.editor);
    return fields;
  });
  const [key, setKey] = useState(entry?.key ?? initialKey ?? "");
  const [keyTouched, setKeyTouched] = useState(Boolean(entry ?? initialKey));
  const [error, setError] = useState<string | null>(null);

  const others = new Set([...takenKeys].filter((taken) => taken !== entry?.key));
  const fields: Values = {
    ...values,
    ...(values.author ? { author: joinAuthors(values.author) } : {}),
    ...(values.editor ? { editor: joinAuthors(values.editor) } : {}),
  };
  const shownKey = keyTouched ? key : suggestKey(fields, others);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.title?.trim()) return setError("Escribe el título.");
    if (!KEY_PATTERN.test(shownKey)) {
      return setError(
        "La clave solo admite letras, números y los signos : . - + /, sin espacios.",
      );
    }
    if (others.has(shownKey))
      return setError(`Ya hay una referencia con la clave «${shownKey}».`);
    const offered = new Set<string>(TYPE_FIELDS[type]);
    const kept = Object.fromEntries(
      Object.entries(fields).filter(([field]) => offered.has(field)),
    ) as Values;
    // Fields the form does not offer for this type stay as they were.
    const extra = Object.fromEntries(
      Object.entries(entry?.fields ?? {}).filter(([field]) => !offered.has(field)),
    );
    onSave({ type, key: shownKey, fields: kept }, extra);
    onClose();
  };

  const field = (name: BibField) => {
    const multiline = name === "author" || name === "editor";
    const inputId = `${id}-${name}`;
    const common = {
      id: inputId,
      value: values[name] ?? "",
      onChange: (event: { target: { value: string } }) => {
        setValues((current) => ({ ...current, [name]: event.target.value }));
        setError(null);
      },
      "aria-describedby": HINTS[name] ? `${inputId}-hint` : undefined,
    };
    return (
      <div
        key={name}
        className={
          multiline || name === "title" ? "col-span-2 grid gap-1.5" : "grid gap-1.5"
        }
      >
        <Label htmlFor={inputId} className="text-ui">
          {FIELD_LABELS[name]}
        </Label>
        {multiline ? (
          <textarea
            {...common}
            rows={3}
            spellCheck={false}
            className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        ) : (
          <Input {...common} className="h-8" />
        )}
        {HINTS[name] ? (
          <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
            {HINTS[name]}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>
              {entry ? "Editar la referencia" : "Nueva referencia"}
            </DialogTitle>
            <DialogDescription>
              Se guarda en BibTeX con el documento. Cítala en el texto con [@
              {shownKey || "clave"}].
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-type`} className="text-ui">
                Tipo
              </Label>
              <Select
                value={type}
                onValueChange={(value) => isBibType(value) && setType(value)}
              >
                <SelectTrigger id={`${id}-type`} size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BIB_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TYPE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-key`} className="text-ui">
                Clave
              </Label>
              <Input
                id={`${id}-key`}
                value={shownKey}
                onChange={(event) => {
                  setKey(event.target.value.trim());
                  setKeyTouched(true);
                  setError(null);
                }}
                spellCheck={false}
                className="h-8 font-mono text-xs"
              />
            </div>
            {TYPE_FIELDS[type].map(field)}
          </div>

          {error ? (
            <p role="alert" className="text-ui text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">
              {entry ? "Guardar cambios" : "Añadir referencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
