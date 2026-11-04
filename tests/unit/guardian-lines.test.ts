import { describe, expect, it } from "vitest";

import {
  GUARDIAN_LINES,
  getGuardianLineForDate,
} from "@/lib/guardian-lines";

describe("guardian lines", () => {
  it("has exactly 15 non-empty, unique lines", () => {
    expect(GUARDIAN_LINES).toHaveLength(15);

    for (const line of GUARDIAN_LINES) {
      expect(line.trim().length).toBeGreaterThan(0);
    }

    expect(new Set(GUARDIAN_LINES).size).toBe(GUARDIAN_LINES.length);
  });

  it("chooses a stable line for the same circle day", () => {
    const first = getGuardianLineForDate(new Date("2026-05-14T10:00:00Z"));
    const second = getGuardianLineForDate(new Date("2026-05-14T20:00:00Z"));

    expect(first).toBe(second);
    expect(GUARDIAN_LINES).toContain(first);
  });

  it("returns a line from the constant for adjacent days", () => {
    expect(
      GUARDIAN_LINES,
    ).toContain(getGuardianLineForDate(new Date("2026-05-15T10:00:00Z")));
    expect(
      GUARDIAN_LINES,
    ).toContain(getGuardianLineForDate(new Date("2026-05-16T10:00:00Z")));
  });
});
