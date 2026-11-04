import { describe, expect, it } from "vitest";

import { CHECK_IN_MOOD_OPTIONS, formatWeekRange, moodLabel, presencePercent } from "@/lib/check-in/moods";
import {
  CHECK_IN_MOODS,
  saveCheckInSchema,
  sendEncouragementSchema,
} from "@/lib/validation/check-in";

describe("check-in validation", () => {
  it("covers every mood exactly once", () => {
    expect(CHECK_IN_MOOD_OPTIONS.map((option) => option.id)).toEqual([
      ...CHECK_IN_MOODS,
    ]);
  });

  it("accepts a mood with no note as null", () => {
    const parsed = saveCheckInSchema.parse({ mood: "steady", note: "   " });
    expect(parsed.note).toBeNull();
  });

  it("trims a note and rejects one over 280 characters", () => {
    const parsed = saveCheckInSchema.parse({
      mood: "heavy",
      note: "  Please pray for my week.  ",
    });
    expect(parsed.note).toBe("Please pray for my week.");

    const tooLong = saveCheckInSchema.safeParse({
      mood: "heavy",
      note: "a".repeat(281),
    });
    expect(tooLong.success).toBe(false);
  });

  it("requires an encouraging note to have content", () => {
    expect(
      sendEncouragementSchema.safeParse({
        toUserId: "8f14e45f-ceea-467f-a5b0-0f1e2b3c4d5e",
        body: "   ",
      }).success,
    ).toBe(false);
  });
});

describe("check-in display helpers", () => {
  it("labels a missing mood gently", () => {
    expect(moodLabel(null)).toBe("Not checked in");
    expect(moodLabel("grateful")).toBe("Grateful");
  });

  it("formats a Monday-to-Sunday week range", () => {
    expect(formatWeekRange("2026-11-02")).toBe("2 Nov – 8 Nov 2026");
  });

  it("keeps presence between 0 and 100", () => {
    expect(presencePercent(0, 0)).toBe(0);
    expect(presencePercent(3, 6)).toBe(50);
    expect(presencePercent(6, 3)).toBe(100);
  });
});
