const MAX_BASE_LENGTH = 60;
const FALLBACK_BASE = "documento";

/**
 * A safe file name for an export, derived from the document title:
 * "Introducción a TexFlow" becomes "introduccion-a-texflow.tex".
 */
export function exportFileName(title: string, extension: string): string {
  const base = title
    .normalize("NFD")
    // Combining marks only: \p{Diacritic} would also swallow "^" and "`".
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_BASE_LENGTH)
    .replace(/^-+|-+$/g, "");
  return `${base || FALLBACK_BASE}.${extension}`;
}
