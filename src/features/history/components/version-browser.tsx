"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import type { VersionSummaryDto } from "@/contracts/documents";
import {
  useDocumentSession,
  useDocumentTitle,
} from "@/features/document/hooks/use-document";
import { cn } from "@/lib/utils";

import { useVersionActions } from "../hooks/use-version-actions";
import { useVersionContent, useVersionList } from "../hooks/use-version-history";
import { KeepVersionForm } from "./keep-version-form";
import { RestoreDialog } from "./restore-dialog";
import { Problem, VersionDetail } from "./version-detail";
import { VersionList } from "./version-list";

function ListSkeleton() {
  return (
    <div className="grid gap-3 px-3 pt-4" aria-hidden>
      <Skeleton className="h-3 w-16" />
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-2.5">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
        </div>
      ))}
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
        <History className="size-4" aria-hidden />
      </span>
      <p className="text-ui font-medium">Aún no hay versiones</p>
      <p className="text-xs text-muted-foreground">
        Mientras escribes, TexFlow guarda una versión cada diez minutos. Antes de un
        cambio importante, guarda una con nombre.
      </p>
    </div>
  );
}

/**
 * The document's history: its versions on one side, and on the other how the chosen
 * one differs from the text now, with the way to put it back.
 */
export function VersionBrowser({ onRestored }: { onRestored: () => void }) {
  const session = useDocumentSession();
  const currentTitle = useDocumentTitle();
  const { keep, restore, restoring } = useVersionActions();
  const { list, retry, prepend } = useVersionList(session.id);
  // The dialog shows one moment: "hoy" does not move under the writer while it is open.
  const [now] = useState(() => new Date());
  const [chosenId, setChosenId] = useState<string | null>(null);
  /** On a phone the list and the chosen version take turns on screen. */
  const [phoneShows, setPhoneShows] = useState<"list" | "version">("list");
  const [confirming, setConfirming] = useState<VersionSummaryDto | null>(null);

  const versions = list.status === "ready" ? list.versions : [];
  const selected =
    versions.find((version) => version.id === chosenId) ?? versions[0] ?? null;
  const { content, retry: retryContent } = useVersionContent(
    session.id,
    selected?.id ?? null,
  );

  const kept = (named: VersionSummaryDto) => {
    prepend(named);
    setChosenId(named.id);
    toast.success("Versión guardada", { description: named.label ?? undefined });
  };

  const confirmRestore = async () => {
    if (!confirming) return;
    const done = await restore(confirming);
    setConfirming(null);
    if (done) onRestored();
  };

  return (
    <div className="grid min-h-0 flex-1 md:grid-cols-[17rem_minmax(0,1fr)]">
      <aside
        className={cn(
          "min-h-0 flex-col border-border md:flex md:border-r",
          phoneShows === "list" ? "flex" : "hidden",
        )}
      >
        <div className="border-b p-3">
          <KeepVersionForm onKeep={keep} onKept={kept} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.status === "loading" ? <ListSkeleton /> : null}
          {list.status === "failed" ? (
            <Problem
              message={`No se pudo cargar el historial. ${list.message}`}
              onRetry={retry}
            />
          ) : null}
          {list.status === "ready" && versions.length === 0 ? <EmptyHistory /> : null}
          {versions.length > 0 ? (
            <VersionList
              versions={versions}
              selectedId={selected?.id ?? null}
              currentTitle={currentTitle}
              now={now}
              onSelect={setChosenId}
              onOpen={(id) => {
                setChosenId(id);
                setPhoneShows("version");
              }}
            />
          ) : null}
        </div>
      </aside>

      <section
        aria-label="Versión elegida"
        className={cn(
          "min-h-0 flex-col md:flex",
          phoneShows === "version" ? "flex" : "hidden",
        )}
      >
        {selected ? (
          <VersionDetail
            selected={selected}
            content={content}
            now={now}
            restoring={restoring}
            onRetry={retryContent}
            onRestore={() => setConfirming(selected)}
            onBack={() => setPhoneShows("list")}
          />
        ) : null}
        {!selected && list.status === "ready" ? (
          <div className="grid flex-1 place-items-center p-6 text-center text-ui text-muted-foreground">
            Las versiones aparecerán aquí.
          </div>
        ) : null}
      </section>

      <RestoreDialog
        version={confirming}
        now={now}
        pending={restoring !== null}
        onConfirm={() => void confirmRestore()}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
