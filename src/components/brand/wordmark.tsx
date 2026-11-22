import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/**
 * The TexFlow logotype. The dropped, tucked-in E follows the TeX logo convention, which
 * is the one mark every LaTeX user recognises.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label={site.name}
      className={cn(
        "inline-flex items-baseline font-display text-[1.25rem] leading-none font-semibold text-foreground select-none",
        className,
      )}
    >
      <span aria-hidden>T</span>
      <span aria-hidden className="-mr-[0.09em] -ml-[0.15em] translate-y-[0.21em]">
        E
      </span>
      <span aria-hidden>X</span>
      <span aria-hidden>Flow</span>
    </span>
  );
}
