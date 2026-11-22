import { describe, expect, it } from "vitest";

import { trashLine } from "./trash-view";

const now = new Date("2026-11-14T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();

describe("trashLine", () => {
  it("says when a document was deleted and when it goes for good", () => {
    expect(trashLine(now.toISOString(), now)).toBe(
      "Eliminado ahora mismo · se borrará en 30 días",
    );
    expect(trashLine(daysAgo(2), now)).toBe("Eliminado anteayer · se borrará en 28 días");
    expect(trashLine(daysAgo(3), now)).toBe(
      "Eliminado hace 3 días · se borrará en 27 días",
    );
    expect(trashLine(daysAgo(29), now)).toBe("Eliminado el 16 oct · se borrará mañana");
    expect(trashLine(daysAgo(30), now)).toBe("Eliminado el 15 oct · se borrará hoy");
  });

  it("never counts from before the deletion", () => {
    const later = new Date(now.getTime() + 10 * 60_000).toISOString();
    expect(trashLine(later, now)).toBe("Eliminado ahora mismo · se borrará en 30 días");
  });
});
