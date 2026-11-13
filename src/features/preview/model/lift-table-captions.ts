/**
 * Moves each table's caption out of the table, into a paragraph just before it. A
 * caption inside a table is only as wide as the table; LaTeX sets it across the text
 * block, and a narrow table would otherwise squeeze its caption into a column.
 */
export function liftTableCaptions(root: ParentNode): void {
  for (const caption of root.querySelectorAll("table > caption")) {
    const table = caption.parentElement;
    if (!table) continue;
    const lifted = caption.ownerDocument.createElement("p");
    lifted.className = "table-caption";
    lifted.append(...caption.childNodes);
    caption.remove();
    table.before(lifted);
  }
}
