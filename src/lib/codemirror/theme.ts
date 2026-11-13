import { EditorView } from "@codemirror/view";

const selection = "oklch(from var(--highlight) l c h / 0.28)";
const hover = "color-mix(in oklch, var(--foreground) 6%, transparent)";

/**
 * The editor's look. Every value is a design token, so the editor follows the app
 * theme without being reconfigured.
 */
export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--foreground)",
    backgroundColor: "transparent",
    fontSize: "0.8125rem",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-family-mono)",
    // Source must show the characters typed: ligatures turn "|---|" into other glyphs.
    fontVariantLigatures: "none",
    lineHeight: "1.7",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "0.875rem 0 40vh",
    caretColor: "var(--highlight)",
  },
  ".cm-line": { padding: "0 1.25rem 0 0.5rem" },
  ".cm-gutters": {
    color: "var(--faint-foreground)",
    backgroundColor: "transparent",
    border: "none",
    userSelect: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "2.75rem",
    padding: "0 0.5rem 0 0.75rem",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in oklch, var(--foreground) 3.5%, transparent)",
  },
  ".cm-activeLineGutter": {
    color: "var(--foreground)",
    backgroundColor: "transparent",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--highlight)",
    borderLeftWidth: "2px",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
    { backgroundColor: selection },
  ".cm-selectionMatch": {
    backgroundColor: "oklch(from var(--highlight) l c h / 0.14)",
  },
  "&.cm-focused .cm-matchingBracket": {
    backgroundColor: "oklch(from var(--highlight) l c h / 0.22)",
    outline: "none",
  },
  ".cm-placeholder": { color: "var(--faint-foreground)" },
  ".cm-snippetField": {
    backgroundColor: "oklch(from var(--highlight) l c h / 0.16)",
    borderRadius: "2px",
  },

  ".cm-tooltip": {
    color: "var(--popover-foreground)",
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--elevation-overlay)",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "var(--font-family-sans)",
    maxHeight: "16rem",
    padding: "0.25rem",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    display: "flex",
    alignItems: "baseline",
    gap: "0.75rem",
    padding: "0.25rem 0.5rem",
    borderRadius: "calc(var(--radius) * 0.75)",
    lineHeight: "1.5",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    color: "var(--foreground)",
    backgroundColor: "var(--muted)",
  },
  ".cm-completionIcon": { display: "none" },
  ".cm-completionLabel": {
    color: "var(--foreground)",
    fontFamily: "var(--font-family-mono)",
  },
  ".cm-completionMatchedText": {
    color: "var(--syntax-math)",
    textDecoration: "none",
  },
  ".cm-completionDetail": {
    marginLeft: "auto",
    color: "var(--muted-foreground)",
    fontStyle: "normal",
  },

  ".cm-panels": {
    color: "var(--foreground)",
    backgroundColor: "var(--surface-raised)",
  },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--border)" },
  ".cm-search": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.5rem 2rem 0.5rem 0.75rem",
  },
  ".cm-search br": { display: "none" },
  ".cm-search label": {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: "var(--muted-foreground)",
  },
  ".cm-textfield": {
    height: "1.75rem",
    padding: "0 0.5rem",
    color: "var(--foreground)",
    backgroundColor: "var(--background)",
    border: "1px solid var(--input)",
    borderRadius: "calc(var(--radius) * 0.75)",
    fontSize: "inherit",
  },
  ".cm-button": {
    height: "1.75rem",
    padding: "0 0.625rem",
    color: "var(--foreground)",
    backgroundImage: "none",
    backgroundColor: "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) * 0.75)",
    fontSize: "inherit",
    cursor: "pointer",
  },
  ".cm-button:hover": { backgroundColor: hover },
  ".cm-panel.cm-search [name=close]": {
    top: "0.5rem",
    right: "0.625rem",
    color: "var(--muted-foreground)",
    fontSize: "1.125rem",
    cursor: "pointer",
  },
  ".cm-searchMatch": {
    backgroundColor: "oklch(from var(--highlight) l c h / 0.22)",
    borderRadius: "2px",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "oklch(from var(--highlight) l c h / 0.5)",
  },
});
