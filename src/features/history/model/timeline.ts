import type { VersionSummaryDto } from "@/contracts/documents";

/** How the history names and dates its versions. */

const KIND_NAMES: Readonly<Record<VersionSummaryDto["kind"], string>> = {
  auto: "Guardado automático",
  named: "Versión con nombre",
  "before-restore": "Antes de restaurar",
};

/** The writer's name for a version, or what kept it. */
export function versionName(version: Pick<VersionSummaryDto, "kind" | "label">): string {
  return version.label ?? KIND_NAMES[version.kind];
}

/** What kept a version, for the line under its name. */
export function versionKindName(kind: VersionSummaryDto["kind"]): string {
  return KIND_NAMES[kind];
}

const time = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const dayThisYear = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dayOtherYear = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDay = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

export function versionTime(iso: string): string {
  return time.format(new Date(iso));
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Days between the day of `date` and today: 0 today, 1 yesterday. */
function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
}

const capitalized = (text: string) =>
  text.charAt(0).toLocaleUpperCase("es") + text.slice(1);

/** "Hoy", "Ayer", "Jueves, 12 de noviembre", or with the year when it is another. */
export function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  const ago = daysAgo(date, now);
  if (ago === 0) return "Hoy";
  if (ago === 1) return "Ayer";
  const format = date.getFullYear() === now.getFullYear() ? dayThisYear : dayOtherYear;
  return capitalized(format.format(date));
}

/** When a version was kept, in a sentence: "hoy a las 14:32", "el 12 nov a las 9:05". */
export function versionMoment(iso: string, now: Date): string {
  const date = new Date(iso);
  const ago = daysAgo(date, now);
  const at = `a las ${time.format(date)}`;
  if (ago === 0) return `hoy ${at}`;
  if (ago === 1) return `ayer ${at}`;
  const day = shortDay.format(date);
  return date.getFullYear() === now.getFullYear()
    ? `el ${day} ${at}`
    : `el ${day} de ${date.getFullYear()} ${at}`;
}

export interface VersionDay<Version> {
  /** The day itself, unique in the history. */
  readonly key: string;
  readonly label: string;
  readonly versions: readonly Version[];
}

/** Versions, newest first, in groups by the day they were kept. */
export function groupByDay<Version extends Pick<VersionSummaryDto, "createdAt">>(
  versions: readonly Version[],
  now: Date,
): VersionDay<Version>[] {
  const days: { key: string; label: string; versions: Version[] }[] = [];
  for (const version of versions) {
    const date = new Date(version.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const day = days.at(-1);
    if (day?.key === key) day.versions.push(version);
    else days.push({ key, label: dayLabel(version.createdAt, now), versions: [version] });
  }
  return days;
}
