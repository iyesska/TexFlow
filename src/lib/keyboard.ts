/** A keyboard shortcut, described by physical key so it survives layout changes. */
export interface KeyCombo {
  /** `KeyboardEvent.code`, e.g. "Digit1" or "KeyS". */
  readonly code: string;
  readonly alt?: boolean;
  readonly shift?: boolean;
  /** Ctrl on Windows and Linux, Command on macOS. */
  readonly mod?: boolean;
}

type ComboEvent = Pick<
  KeyboardEvent,
  "code" | "altKey" | "shiftKey" | "ctrlKey" | "metaKey"
>;

export function matchesCombo(event: ComboEvent, combo: KeyCombo): boolean {
  return (
    event.code === combo.code &&
    event.altKey === Boolean(combo.alt) &&
    event.shiftKey === Boolean(combo.shift) &&
    (event.ctrlKey || event.metaKey) === Boolean(combo.mod)
  );
}

const KEY_NAMES: Readonly<Record<string, string>> = { Enter: "Intro", Space: "Espacio" };

const baseKey = (combo: KeyCombo) =>
  KEY_NAMES[combo.code] ?? combo.code.replace(/^(Digit|Key)/, "");

/** Key caps to display for a combo, in the order they are pressed. */
export function comboKeys(combo: KeyCombo, isMac = false): string[] {
  const keys: string[] = [];
  if (combo.mod) keys.push(isMac ? "⌘" : "Ctrl");
  if (combo.alt) keys.push(isMac ? "⌥" : "Alt");
  if (combo.shift) keys.push(isMac ? "⇧" : "Shift");
  keys.push(baseKey(combo));
  return keys;
}

/** The combo in CodeMirror's key notation, e.g. "Mod-Shift-8". */
export function codeMirrorKey(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.mod) parts.push("Mod");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  const key = combo.code.replace(/^(Digit|Key)/, "");
  // Single characters are written in lower case; named keys keep their name.
  parts.push(key.length === 1 ? key.toLowerCase() : key);
  return parts.join("-");
}
