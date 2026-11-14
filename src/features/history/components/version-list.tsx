"use client";

import { Bookmark, Clock, RotateCcw, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

import type { VersionSummaryDto } from "@/contracts/documents";
import { cn } from "@/lib/utils";

import { groupByDay, versionKindName, versionName, versionTime } from "../model/timeline";

const KIND_ICONS: Readonly<Record<VersionSummaryDto["kind"], LucideIcon>> = {
  auto: Clock,
  named: Bookmark,
  "before-restore": RotateCcw,
};

const optionId = (id: string) => `version-${id}`;

/** The line under a version's name: what kept it, and its title if it was another. */
function details(version: VersionSummaryDto, currentTitle: string): string | null {
  const parts = [
    version.kind === "named" ? versionKindName(version.kind) : null,
    version.title && version.title !== currentTitle ? `«${version.title}»` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export interface VersionListProps {
  readonly versions: readonly VersionSummaryDto[];
  readonly selectedId: string | null;
  /** The document's title now: a version's own is shown only when it differs. */
  readonly currentTitle: string;
  readonly now: Date;
  /** Moves the choice, as the arrow keys do. */
  onSelect(id: string): void;
  /** Opens a version, as a click or Enter does: on a phone, its changes take the screen. */
  onOpen(id: string): void;
}

/** The versions as a timeline, newest first and grouped by day. One is chosen. */
export function VersionList(props: VersionListProps) {
  const { versions, selectedId, currentTitle, now, onSelect, onOpen } = props;
  const listRef = useRef<HTMLDivElement>(null);
  const days = groupByDay(versions, now);

  // The chosen version stays in view as the keyboard moves through the list.
  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(selectedId))}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const handleKey = (event: KeyboardEvent) => {
    const index = versions.findIndex((version) => version.id === selectedId);
    const targets: Partial<Record<string, number>> = {
      ArrowDown: Math.min(versions.length - 1, index + 1),
      ArrowUp: Math.max(0, index - 1),
      Home: 0,
      End: versions.length - 1,
    };
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (selectedId) onOpen(selectedId);
      return;
    }
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const version = versions[target];
    if (version) onSelect(version.id);
  };

  return (
    <div
      ref={listRef}
      // aislop-ignore-next-line jsx-a11y/prefer-tag-over-role -- the ARIA listbox pattern: native select and option cannot hold this markup
      role="listbox"
      aria-label="Versiones"
      tabIndex={0}
      aria-activedescendant={selectedId ? optionId(selectedId) : undefined}
      onKeyDown={handleKey}
      className="rounded-md pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
    >
      {days.map((day) => (
        // aislop-ignore-next-line jsx-a11y/prefer-tag-over-role -- groups of a listbox, labelled by their heading: fieldset does not belong in a listbox
        <div key={day.key} role="group" aria-labelledby={`day-${day.key}`}>
          <div
            id={`day-${day.key}`}
            className="sticky top-0 z-10 bg-popover/95 px-3 pt-3 pb-1.5 text-2xs font-medium text-faint-foreground backdrop-blur-sm"
          >
            {day.label}
          </div>
          <div className="relative px-1.5 before:absolute before:top-2 before:bottom-2 before:left-[1.4rem] before:w-px before:bg-border-strong">
            {day.versions.map((version) => {
              const Icon = KIND_ICONS[version.kind];
              const selected = version.id === selectedId;
              const extra = details(version, currentTitle);
              return (
                // aislop-ignore-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus -- options of a listbox driven by aria-activedescendant: the keyboard acts on the listbox
                <div
                  key={version.id}
                  id={optionId(version.id)}
                  // aislop-ignore-next-line jsx-a11y/prefer-tag-over-role -- the ARIA listbox pattern: native select and option cannot hold this markup
                  role="option"
                  aria-selected={selected}
                  onClick={() => onOpen(version.id)}
                  className={cn(
                    "relative flex cursor-default gap-2.5 rounded-md px-1.5 py-1.5 transition-colors duration-(--duration-fast)",
                    selected ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "relative mt-px grid size-5 shrink-0 place-items-center rounded-full bg-popover ring-1 ring-border-strong",
                      version.kind === "named" && "text-highlight ring-highlight/50",
                      version.kind !== "named" && "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-3" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-ui",
                          version.kind === "named" ? "font-medium" : "text-foreground/90",
                        )}
                      >
                        {versionName(version)}
                      </span>
                      <time
                        dateTime={version.createdAt}
                        className="shrink-0 text-2xs text-faint-foreground tabular-nums"
                      >
                        {versionTime(version.createdAt)}
                      </time>
                    </span>
                    {extra ? (
                      <span className="block truncate text-2xs text-muted-foreground">
                        {extra}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
