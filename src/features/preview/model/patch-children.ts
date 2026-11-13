/**
 * Makes `container`'s children equal to `next`'s while touching as few nodes as
 * possible: blocks that did not change stay in place. Typing in one paragraph then
 * does not reload images or re-lay out formulas elsewhere in the document.
 */
export function patchChildren(container: Element, next: DocumentFragment): void {
  const current = Array.from(container.childNodes);
  const incoming = Array.from(next.childNodes);
  const shortest = Math.min(current.length, incoming.length);

  let start = 0;
  while (start < shortest && current[start]?.isEqualNode(incoming[start] ?? null))
    start++;

  let currentEnd = current.length;
  let incomingEnd = incoming.length;
  while (
    currentEnd > start &&
    incomingEnd > start &&
    current[currentEnd - 1]?.isEqualNode(incoming[incomingEnd - 1] ?? null)
  ) {
    currentEnd--;
    incomingEnd--;
  }

  const anchor = current[currentEnd] ?? null;
  for (const node of current.slice(start, currentEnd)) node.remove();
  for (const node of incoming.slice(start, incomingEnd))
    container.insertBefore(node, anchor);
}
