import { describe, expect, it } from "vitest";

import {
  makePrayerCursor,
  parsePrayerCursor,
} from "@/lib/prayer/cursor";
import {
  addPrayerUpdateSchema,
  createPrayerSchema,
} from "@/lib/validation/prayer";

const PRAYER_ID = "00000000-0000-4000-8000-000000000001";

describe("prayer validation", () => {
  it("trims prayer bodies and rejects empty or oversized text", () => {
    const valid = createPrayerSchema.safeParse({
      body: "  Please hold this gently.  ",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.body).toBe("Please hold this gently.");
    }

    expect(createPrayerSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(
      createPrayerSchema.safeParse({ body: "x".repeat(1201) }).success,
    ).toBe(false);
  });

  it("keeps updates shorter than prayers", () => {
    expect(
      addPrayerUpdateSchema.safeParse({
        prayerId: PRAYER_ID,
        body: "A quiet update.",
      }).success,
    ).toBe(true);
    expect(
      addPrayerUpdateSchema.safeParse({
        prayerId: PRAYER_ID,
        body: "x".repeat(601),
      }).success,
    ).toBe(false);
    expect(
      addPrayerUpdateSchema.safeParse({
        prayerId: "not-a-uuid",
        body: "Update",
      }).success,
    ).toBe(false);
  });
});

describe("prayer cursor", () => {
  it("round-trips a timestamp and prayer id", () => {
    const cursor = makePrayerCursor(
      "2026-10-28T12:34:56.123456+00:00",
      PRAYER_ID,
    );

    expect(parsePrayerCursor(cursor)).toEqual({
      createdAt: "2026-10-28T12:34:56.123456+00:00",
      id: PRAYER_ID,
    });
  });

  it("rejects malformed cursors", () => {
    expect(parsePrayerCursor(null)).toBeNull();
    expect(parsePrayerCursor("")).toBeNull();
    expect(parsePrayerCursor("2026-10-28T12:34:56Z")).toBeNull();
    expect(
      parsePrayerCursor(`2026-10-28T12:34:56Z|not-a-uuid`),
    ).toBeNull();
    expect(
      parsePrayerCursor(`2026-13-40T12:34:56Z|${PRAYER_ID}`),
    ).toBeNull();
    expect(
      parsePrayerCursor(`not-a-timestamp|${PRAYER_ID}`),
    ).toBeNull();
  });
});
