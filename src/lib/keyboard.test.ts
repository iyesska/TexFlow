import { describe, expect, it } from "vitest";

import { comboKeys, matchesCombo } from "./keyboard";

const event = (overrides: Partial<Parameters<typeof matchesCombo>[0]>) => ({
  code: "Digit1",
  altKey: false,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  ...overrides,
});

describe("matchesCombo", () => {
  it("matches the exact key and modifiers", () => {
    expect(matchesCombo(event({ altKey: true }), { code: "Digit1", alt: true })).toBe(
      true,
    );
  });

  it("rejects extra or missing modifiers", () => {
    const combo = { code: "Digit1", alt: true };
    expect(matchesCombo(event({}), combo)).toBe(false);
    expect(matchesCombo(event({ altKey: true, shiftKey: true }), combo)).toBe(false);
    expect(matchesCombo(event({ altKey: true, ctrlKey: true }), combo)).toBe(false);
  });

  it("treats Ctrl and Command as the same modifier", () => {
    const combo = { code: "KeyS", mod: true };
    expect(matchesCombo(event({ code: "KeyS", ctrlKey: true }), combo)).toBe(true);
    expect(matchesCombo(event({ code: "KeyS", metaKey: true }), combo)).toBe(true);
  });
});

describe("comboKeys", () => {
  it("lists modifiers before the key", () => {
    expect(comboKeys({ code: "Digit2", alt: true })).toEqual(["Alt", "2"]);
    expect(comboKeys({ code: "KeyS", mod: true, shift: true })).toEqual([
      "Ctrl",
      "Shift",
      "S",
    ]);
  });
});
