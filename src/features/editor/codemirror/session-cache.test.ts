import type { StateCommand } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { createEditorSessionCache } from "./session-cache";

const listeners = {
  onDocChange: () => {},
  onCursorChange: () => {},
  onImageFiles: () => {},
  citations: () => [],
};

const append =
  (text: string): StateCommand =>
  ({ state, dispatch }) => {
    dispatch(state.update({ changes: { from: state.doc.length, insert: text } }));
    return true;
  };

function mount(cache: ReturnType<typeof createEditorSessionCache>, markdown: string) {
  cache.connect(listeners);
  const view = new EditorView({ state: cache.stateFor(markdown), parent: document.body });
  const detach = cache.attach(view);
  return { view, detach };
}

describe("createEditorSessionCache", () => {
  it("runs a command in the editor on screen", () => {
    const cache = createEditorSessionCache();
    const { view } = mount(cache, "Texto");
    cache.run(append(" y más"));
    expect(view.state.doc.toString()).toBe("Texto y más");
    view.destroy();
  });

  it("keeps a command until the editor is on screen", () => {
    const cache = createEditorSessionCache();
    cache.run(append("."));
    const { view } = mount(cache, "Texto");
    expect(view.state.doc.toString()).toBe("Texto.");
    view.destroy();
  });

  it("focuses and inserts only while an editor is attached", () => {
    const cache = createEditorSessionCache();
    expect(cache.focus()).toBe(false);
    expect(cache.insertAtCursor("[@a]")).toBe(false);
    const { view, detach } = mount(cache, "Según");
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(cache.insertAtCursor("[@a]")).toBe(true);
    expect(view.state.doc.toString()).toBe("Según [@a]");
    detach();
    expect(cache.focus()).toBe(false);
    view.destroy();
  });
});
