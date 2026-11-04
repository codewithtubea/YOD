import { describe, expect, it } from "vitest";

import {
  addDaysToIsoDate,
  circleDateInTimeZone,
  formatCircleDate,
  formatPlanDate,
  isValidTimeZone,
  parseIsoDate,
} from "@/lib/date";

describe("circle dates", () => {
  it("computes today in the circle timezone, not the server timezone", () => {
    const instant = new Date("2026-10-25T23:30:00Z");

    expect(circleDateInTimeZone(instant, "Africa/Accra")).toBe("2026-10-25");
    expect(circleDateInTimeZone(instant, "America/Los_Angeles")).toBe(
      "2026-10-25",
    );
    expect(circleDateInTimeZone(instant, "Pacific/Kiritimati")).toBe(
      "2026-10-26",
    );
  });

  it("falls back to the circle timezone for an invalid zone", () => {
    const instant = new Date("2026-10-25T23:30:00Z");

    expect(circleDateInTimeZone(instant, "Not/AZone")).toBe("2026-10-25");
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("Africa/Accra")).toBe(true);
  });

  it("parses only real ISO calendar dates", () => {
    expect(parseIsoDate("2024-02-29")).toBe("2024-02-29");
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-2-03")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });

  it("adds days across months, years, and leap days", () => {
    expect(addDaysToIsoDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysToIsoDate("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDaysToIsoDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysToIsoDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToIsoDate("not-a-date", 1)).toBeNull();
  });

  it("formats plan dates without drifting across timezones", () => {
    expect(formatPlanDate("2026-10-25")).toContain("25 Oct 2026");
    expect(formatPlanDate("2026-10-25", false)).toBe("25 Oct 2026");
    expect(formatPlanDate("nope")).toBe("nope");
    expect(formatCircleDate(new Date("2026-10-25T12:00:00Z"))).toContain(
      "25 October",
    );
  });
});
