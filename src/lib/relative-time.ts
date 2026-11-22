const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const thisYear = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const otherYear = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * When something last changed, as people say it: "hace 5 minutos", "ayer", and past
 * a week the date itself.
 */
export function formatChangedAt(iso: string, now: Date): string {
  const date = new Date(iso);
  const seconds = (date.getTime() - now.getTime()) / 1000;
  const elapsed = Math.abs(seconds);
  if (elapsed < 60) return "ahora mismo";
  if (elapsed >= 7 * 86_400) {
    return (date.getFullYear() === now.getFullYear() ? thisYear : otherYear).format(date);
  }
  for (const [unit, size] of UNITS) {
    if (elapsed >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "ahora mismo";
}
