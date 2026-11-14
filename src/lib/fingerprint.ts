/**
 * A short, stable fingerprint of a text (FNV-1a, 32 bits): enough to tell whether it
 * changed, as part of a cache key. Not for anything that must resist collisions.
 */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
