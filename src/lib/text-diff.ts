export interface TextChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}

/**
 * The smallest single replacement that turns `previous` into `next`: everything
 * between their common prefix and common suffix. Applying only that keeps the
 * viewer's scroll position and selection steady while the document is retyped.
 */
export function minimalChange(previous: string, next: string): TextChange | null {
  if (previous === next) return null;
  const limit = Math.min(previous.length, next.length);

  let prefix = 0;
  while (prefix < limit && previous.charCodeAt(prefix) === next.charCodeAt(prefix))
    prefix++;

  let suffix = 0;
  while (
    suffix < limit - prefix &&
    previous.charCodeAt(previous.length - 1 - suffix) ===
      next.charCodeAt(next.length - 1 - suffix)
  ) {
    suffix++;
  }

  return {
    from: prefix,
    to: previous.length - suffix,
    insert: next.slice(prefix, next.length - suffix),
  };
}
