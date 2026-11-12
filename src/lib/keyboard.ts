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

/** Key caps to display for a combo, in the order they are pressed. */
export function comboKeys(combo: KeyCombo): string[] {
  const keys: string[] = [];
  if (combo.mod) keys.push("Ctrl");
  if (combo.alt) keys.push("Alt");
  if (combo.shift) keys.push("Shift");
  keys.push(combo.code.replace(/^(Digit|Key)/, ""));
  return keys;
}
