import "server-only";

import { DEFAULT_SETTINGS } from "@/templates/catalog";
import { documentSettingsSchema, type DocumentSettings } from "@/templates/settings";

/** Stored settings are re-validated: rows written by older versions open with defaults. */
export function readSettings(value: unknown): DocumentSettings {
  const parsed = documentSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
