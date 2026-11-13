/**
 * The images a document actually refers to, out of all those stored with it. Only
 * these are uploaded for a compile. Matching by name is deliberately loose: sending an
 * image the document merely mentions costs a little, missing one breaks the PDF.
 */
export function imagesUsedBy<Image extends { readonly name: string }>(
  markdown: string,
  images: Iterable<Image>,
): Image[] {
  return [...images].filter((image) => markdown.includes(image.name));
}

/** Identifies what a compile was run on, to tell later whether it is still current. */
export function compilationKey(
  markdown: string,
  imageNames: readonly string[],
  design: string,
): string {
  return `${design}\n${[...imageNames].sort().join("|")}\n${markdown}`;
}
