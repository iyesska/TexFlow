import { strToU8, zipSync, type Zippable } from "fflate";

export interface ProjectFiles {
  /** Name shared by the folder and the main files, e.g. "mi-tesis". */
  readonly baseName: string;
  readonly markdown: string;
  readonly latex: string;
  /** The document's images, by the name the sources refer to them with. */
  readonly images: readonly { readonly name: string; readonly data: Uint8Array }[];
  /** The compiled PDF, when there is one that matches the sources. */
  readonly pdf?: Uint8Array;
}

/**
 * Packs a document into a ZIP that compiles as it is: the Markdown, the LaTeX and the
 * images side by side in one folder, because that is where the LaTeX looks for them.
 */
export function buildProjectArchive(project: ProjectFiles): Uint8Array {
  const { baseName } = project;
  const inFolder = (name: string) => `${baseName}/${name}`;
  const files: Zippable = {
    [inFolder(`${baseName}.md`)]: strToU8(project.markdown),
    [inFolder(`${baseName}.tex`)]: strToU8(project.latex),
  };
  for (const image of project.images) files[inFolder(image.name)] = image.data;
  if (project.pdf) files[inFolder(`${baseName}.pdf`)] = project.pdf;
  // Images and PDFs are already compressed; a light level keeps this fast.
  return zipSync(files, { level: 4 });
}
