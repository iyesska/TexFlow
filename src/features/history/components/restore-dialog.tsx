"use client";

import { LoaderCircle } from "lucide-react";

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
import type { VersionSummaryDto } from "@/contracts/documents";

import { versionMoment } from "../model/timeline";

export interface RestoreDialogProps {
  /** The version to confirm, or null when nothing is being confirmed. */
  readonly version: VersionSummaryDto | null;
  readonly now: Date;
  readonly pending: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** Asks before a restore, and says why nothing is lost by it. */
export function RestoreDialog({
  version,
  now,
  pending,
  onConfirm,
  onCancel,
}: RestoreDialogProps) {
  return (
    <AlertDialog
      open={version !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
    >
      <AlertDialogContent className="data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Restaurar esta versión?</AlertDialogTitle>
          <AlertDialogDescription>
            El documento vuelve a como estaba{" "}
            {version ? versionMoment(version.createdAt, now) : ""}: el texto, el diseño y
            las referencias. Lo que tienes ahora se guarda antes en el historial, así que
            puedes volver a ello.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              // Stay open until the restore is done, so a failure can be read.
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            Restaurar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
