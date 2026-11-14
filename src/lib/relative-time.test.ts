import { describe, expect, it } from "vitest";

import { formatChangedAt } from "./relative-time";

const now = new Date("2026-11-14T12:00:00Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

describe("formatChangedAt", () => {
  it("speaks of recent changes relatively", () => {
    expect(formatChangedAt(ago(20), now)).toBe("ahora mismo");
    expect(formatChangedAt(ago(5 * 60), now)).toBe("hace 5 minutos");
    expect(formatChangedAt(ago(3 * 3600), now)).toBe("hace 3 horas");
    expect(formatChangedAt(ago(26 * 3600), now)).toBe("ayer");
  });

  it("gives the date past a week, with the year only when it is another", () => {
    expect(formatChangedAt("2026-10-02T12:00:00Z", now)).toBe("2 oct");
    expect(formatChangedAt("2025-10-02T12:00:00Z", now)).toBe("2 oct 2025");
  });
});
