import { describe, expect, it } from "vitest";

import { getSkyPeriod } from "@/lib/sky";

function at(iso: string) {
  return new Date(iso);
}

describe("getSkyPeriod", () => {
  it("maps the circle day boundaries in Africa/Accra", () => {
    expect(getSkyPeriod(at("2026-01-01T04:59:00Z"))).toBe("night");
    expect(getSkyPeriod(at("2026-01-01T05:00:00Z"))).toBe("dawn");
    expect(getSkyPeriod(at("2026-01-01T07:59:00Z"))).toBe("dawn");
    expect(getSkyPeriod(at("2026-01-01T08:00:00Z"))).toBe("morning");
    expect(getSkyPeriod(at("2026-01-01T11:59:00Z"))).toBe("morning");
    expect(getSkyPeriod(at("2026-01-01T12:00:00Z"))).toBe("afternoon");
    expect(getSkyPeriod(at("2026-01-01T16:59:00Z"))).toBe("afternoon");
    expect(getSkyPeriod(at("2026-01-01T17:00:00Z"))).toBe("dusk");
    expect(getSkyPeriod(at("2026-01-01T19:59:00Z"))).toBe("dusk");
    expect(getSkyPeriod(at("2026-01-01T20:00:00Z"))).toBe("night");
    expect(getSkyPeriod(at("2026-01-01T23:59:00Z"))).toBe("night");
  });

  it("uses the supplied timezone", () => {
    expect(
      getSkyPeriod(at("2026-01-01T12:00:00Z"), "America/New_York"),
    ).toBe("dawn");
  });
});
