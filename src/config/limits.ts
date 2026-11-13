/**
 * Size limits shared by the client and the server. The client checks them to give
 * immediate feedback; the server enforces them.
 */
export const LIMITS = {
  /** Longest Markdown document that can be converted, in characters. */
  maxMarkdownLength: 500_000,
} as const;
