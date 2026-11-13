import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  isCustomized,
  TEMPLATES,
  templateById,
  templateSettings,
} from "./catalog";
import { documentSettingsSchema, settingsKey, TEMPLATE_IDS } from "./settings";

describe("template catalog", () => {
  it("offers every template exactly once", () => {
    expect(TEMPLATES.map(({ id }) => id).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it("gives every template valid settings", () => {
    for (const template of TEMPLATES) {
      const result = documentSettingsSchema.safeParse(templateSettings(template.id));
      expect(result.success, template.id).toBe(true);
    }
  });

  it("gives every template a distinct look", () => {
    const keys = TEMPLATES.map(({ id }) => settingsKey(templateSettings(id)));
    expect(new Set(keys).size).toBe(TEMPLATES.length);
  });

  it("keeps the document's language when a template is applied", () => {
    expect(templateSettings("thesis", "en")).toMatchObject({
      templateId: "thesis",
      language: "en",
    });
    expect(DEFAULT_SETTINGS.language).toBe("es");
  });

  it("rejects an unknown template", () => {
    expect(() => templateById("poster" as never)).toThrow("Unknown template");
  });
});

describe("documentSettingsSchema", () => {
  const valid = templateSettings("academic-paper");

  it.each([
    ["an unknown font", { ...valid, font: "comic" }],
    ["a font size outside the scale", { ...valid, fontSize: 13 }],
    ["a line spacing outside the scale", { ...valid, lineSpacing: 3 }],
    ["a fractional margin", { ...valid, margins: { ...valid.margins, top: 12.5 } }],
    ["a margin below the minimum", { ...valid, margins: { ...valid.margins, top: 5 } }],
    ["a margin above the maximum", { ...valid, margins: { ...valid.margins, left: 90 } }],
    ["LaTeX smuggled into a field", { ...valid, paperSize: "a4}\\input{/etc/passwd" }],
  ])("rejects %s", (_label, settings) => {
    expect(documentSettingsSchema.safeParse(settings).success).toBe(false);
  });

  it("rejects margins that leave no room for the text, with a reason", () => {
    const result = documentSettingsSchema.safeParse({
      ...valid,
      paperSize: "a5",
      margins: { top: 25, bottom: 25, left: 45, right: 45 },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("izquierdo y derecho");
  });
});

describe("settingsKey", () => {
  it("does not depend on field order", () => {
    const reordered = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).reverse());
    expect(settingsKey(reordered as typeof DEFAULT_SETTINGS)).toBe(
      settingsKey(DEFAULT_SETTINGS),
    );
  });

  it("changes with any setting", () => {
    const changed = {
      ...DEFAULT_SETTINGS,
      margins: { ...DEFAULT_SETTINGS.margins, left: 26 },
    };
    expect(settingsKey(changed)).not.toBe(settingsKey(DEFAULT_SETTINGS));
  });
});

describe("isCustomized", () => {
  it("tells a template's own settings from adjusted ones, whatever the language", () => {
    expect(isCustomized(templateSettings("thesis"))).toBe(false);
    expect(isCustomized(templateSettings("thesis", "en"))).toBe(false);
    expect(isCustomized({ ...templateSettings("thesis"), fontSize: 11 })).toBe(true);
  });
});
