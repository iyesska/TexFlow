/**
 * Size limits shared by the client and the server. The client checks them to give
 * immediate feedback; the server enforces them.
 */
export const LIMITS = {
  /** Longest Markdown document that can be converted, in characters. */
  maxMarkdownLength: 500_000,
  /** Longest bibliography (BibTeX) a document can carry, in characters. */
  maxBibliographyLength: 300_000,
  /**
   * Largest request body carrying a document and its bibliography. UTF-8 uses at
   * most four bytes per character; the rest is room for the JSON envelope.
   */
  maxDocumentBodyBytes: (500_000 + 300_000) * 4 + 4096,
  /** Largest compile request: the document plus the images it uses. */
  maxCompileBodyBytes: 40 * 1024 * 1024,
} as const;
