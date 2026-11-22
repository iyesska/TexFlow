/**
 * The images a document actually refers to, out of all those stored with it. Only
 * these go into a compile. Matching by name is deliberately loose: including an image
 * the document merely mentions costs a little, missing one breaks the PDF.
 */
export function imagesUsedBy<Image extends { readonly name: string }>(
  markdown: string,
  images: Iterable<Image>,
): Image[] {
  return [...images].filter((image) => markdown.includes(image.name));
}
