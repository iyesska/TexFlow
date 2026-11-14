"use client";

import {
  Check,
  CircleDashed,
  KeyRound,
  LoaderCircle,
  Split,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useDocumentSession, useSaveStatus } from "../hooks/use-document";
import type { SaveStatus } from "../model/document-session";

interface StatusView {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly className?: string;
}

const STATUS_VIEWS: Readonly<Record<SaveStatus, StatusView>> = {
  saved: { label: "Guardado", icon: Check },
  unsaved: { label: "Sin guardar", icon: CircleDashed },
  saving: { label: "Guardando…", icon: LoaderCircle, className: "[&_svg]:animate-spin" },
  error: {
    label: "No se pudo guardar",
    icon: TriangleAlert,
    className: "text-destructive",
  },
  "signed-out": { label: "Sesión caducada", icon: KeyRound, className: "text-warning" },
  conflict: { label: "Cambiado en otro sitio", icon: Split, className: "text-warning" },
};

/**
 * Asks whose version stays when the document was saved elsewhere while being edited
 * here. Never opens by itself: it would take the keyboard from the writer mid-sentence.
 */
function ConflictDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useDocumentSession();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Este documento ha cambiado en otro sitio</AlertDialogTitle>
          <AlertDialogDescription>
            Se guardó desde otra pestaña o dispositivo mientras lo editabas aquí. Elige
            qué versión conservar: la otra se perderá.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Decidir más tarde</AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            onClick={() => {
              session.abandon();
              window.location.reload();
            }}
          >
            Cargar la otra versión
          </AlertDialogAction>
          <AlertDialogAction onClick={() => void session.overwrite()}>
            Conservar la mía
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Tells the writer whether their work is safe, and what to do when it is not. */
export function SaveIndicator() {
  const session = useDocumentSession();
  const status = useSaveStatus();
  const [resolving, setResolving] = useState(false);
  const previous = useRef(status);

  // A conflict is worth a word the first time it happens; the indicator keeps it.
  useEffect(() => {
    if (status === "conflict" && previous.current !== "conflict") {
      toast.warning("Este documento se ha guardado en otro sitio", {
        description:
          "Tus cambios no se guardarán hasta que elijas qué versión conservar.",
        action: { label: "Resolver", onClick: () => setResolving(true) },
      });
    }
    previous.current = status;
  }, [status]);

  const { label, icon: Icon, className } = STATUS_VIEWS[status];
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        role="status"
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">{label}</span>
      </span>
      {status === "error" ? (
        <Button variant="outline" size="xs" onClick={() => void session.flush()}>
          Reintentar
        </Button>
      ) : null}
      {status === "signed-out" ? (
        <Button variant="outline" size="xs" asChild>
          {/* A new tab, so the unsaved work here stays; it is saved once signed in. */}
          <a href="/login?next=/documents" target="_blank" rel="noopener">
            Iniciar sesión
          </a>
        </Button>
      ) : null}
      {status === "conflict" ? (
        <Button variant="outline" size="xs" onClick={() => setResolving(true)}>
          Resolver
        </Button>
      ) : null}
      <ConflictDialog open={resolving} onOpenChange={setResolving} />
    </div>
  );
}
