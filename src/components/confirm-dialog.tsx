"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmDialogProps {
  readonly title: string;
  readonly description: string;
  /** The action's name, the same as on the button that asked for it. */
  readonly confirmLabel: string;
  /** Does the work; resolves to true when it is done and the dialog can close. */
  onConfirm(): Promise<boolean>;
  onClose(): void;
}

/** Confirms an action that cannot be undone. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  const confirm = async (event: Event | React.MouseEvent) => {
    // Stay open until the work is done, so a failure can be read.
    event.preventDefault();
    setPending(true);
    const done = await props.onConfirm();
    setPending(false);
    if (done) props.onClose();
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && props.onClose()}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            {props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
