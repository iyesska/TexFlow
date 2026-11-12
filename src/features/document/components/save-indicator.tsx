"use client";

import {
  Check,
  CircleDashed,
  LoaderCircle,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useDocumentSession, useSaveStatus } from "../hooks/use-document";
import type { SaveStatus } from "../model/document-session";

interface StatusView {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly className?: string;
}

const STATUS_VIEWS: Readonly<Record<Exclude<SaveStatus, "loading">, StatusView>> = {
  saved: { label: "Guardado", icon: Check },
  unsaved: { label: "Sin guardar", icon: CircleDashed },
  saving: { label: "Guardando…", icon: LoaderCircle, className: "[&_svg]:animate-spin" },
  error: {
    label: "No se pudo guardar",
    icon: TriangleAlert,
    className: "text-destructive",
  },
};

/** Tells the writer whether their work is safe, and offers a retry when it is not. */
export function SaveIndicator() {
  const session = useDocumentSession();
  const status = useSaveStatus();
  if (status === "loading") return null;

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
    </div>
  );
}
