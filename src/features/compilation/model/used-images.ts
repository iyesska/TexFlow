/** Identifies what a compile was run on, to tell later whether it is still current. */
export function compilationKey(
  markdown: string,
  imageNames: readonly string[],
  design: string,
): string {
  return `${design}\n${[...imageNames].sort().join("|")}\n${markdown}`;
}
