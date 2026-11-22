import { describe, expect, it } from "vitest";

import { dayLabel, groupByDay, versionMoment, versionName } from "./timeline";

// Dates in the local time zone, so the days do not depend on where the tests run.
const at = (month: number, day: number, hour = 12, minute = 0, year = 2026) =>
  new Date(year, month - 1, day, hour, minute).toISOString();

const now = new Date(2026, 10, 14, 18, 30);

describe("versionName", () => {
  it("prefers the writer's name and otherwise says what kept the version", () => {
    expect(versionName({ kind: "named", label: "Entrega al tutor" })).toBe(
      "Entrega al tutor",
    );
    expect(versionName({ kind: "auto", label: null })).toBe("Guardado automático");
    expect(versionName({ kind: "before-restore", label: null })).toBe(
      "Antes de restaurar",
    );
  });
});

describe("dayLabel", () => {
  it("names today and yesterday, and dates the days before", () => {
    expect(dayLabel(at(11, 14, 0, 5), now)).toBe("Hoy");
    expect(dayLabel(at(11, 13, 23, 59), now)).toBe("Ayer");
    expect(dayLabel(at(11, 12), now)).toBe("Jueves, 12 de noviembre");
    expect(dayLabel(at(12, 30, 12, 0, 2025), now)).toBe("30 de diciembre de 2025");
  });
});

describe("versionMoment", () => {
  it("says when a version was kept, in a sentence", () => {
    expect(versionMoment(at(11, 14, 14, 32), now)).toBe("hoy a las 14:32");
    expect(versionMoment(at(11, 13, 9, 5), now)).toBe("ayer a las 09:05");
    expect(versionMoment(at(11, 2, 9, 5), now)).toBe("el 2 nov a las 09:05");
    expect(versionMoment(at(1, 2, 9, 5, 2025), now)).toBe("el 2 ene de 2025 a las 09:05");
  });
});

describe("groupByDay", () => {
  it("groups versions, newest first, by the day they were kept", () => {
    const versions = [
      { id: "c", createdAt: at(11, 14, 16) },
      { id: "b", createdAt: at(11, 14, 9) },
      { id: "a", createdAt: at(11, 10, 20) },
    ];
    expect(
      groupByDay(versions, now).map((day) => [
        day.label,
        day.versions.map(({ id }) => id),
      ]),
    ).toEqual([
      ["Hoy", ["c", "b"]],
      ["Martes, 10 de noviembre", ["a"]],
    ]);
  });
});
