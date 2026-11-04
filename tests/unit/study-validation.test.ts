import { describe, expect, it } from "vitest";

import {
  createPostSchema,
  createReplySchema,
  generatePlanSchema,
  singlePlanSchema,
} from "@/lib/validation/study";

const POST_ID = "00000000-0000-4000-8000-000000000001";

describe("study validation", () => {
  it("trims post bodies and rejects empty or oversized text", () => {
    const valid = createPostSchema.safeParse({
      planDate: "2026-10-25",
      kind: "thought",
      body: "  A quiet word.  ",
    });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.body).toBe("A quiet word.");

    expect(
      createPostSchema.safeParse({
        planDate: "2026-10-25",
        kind: "thought",
        body: "   ",
      }).success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({
        planDate: "2026-10-25",
        kind: "thought",
        body: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("rejects a fake calendar date", () => {
    const result = createPostSchema.safeParse({
      planDate: "2026-02-30",
      kind: "question",
      body: "Why?",
    });
    expect(result.success).toBe(false);
  });

  it("requires UUIDs and accepts an optional parent reply", () => {
    expect(
      createReplySchema.safeParse({ postId: POST_ID, body: "Amen" }).success,
    ).toBe(true);
    expect(
      createReplySchema.safeParse({
        postId: POST_ID,
        parentReplyId: "not-a-uuid",
        body: "Nested",
      }).success,
    ).toBe(false);
  });

  it("requires an ending chapter on or after the starting chapter", () => {
    expect(
      singlePlanSchema.safeParse({
        date: "2026-10-25",
        book: "John",
        chapterStart: 3,
        chapterEnd: 4,
      }).success,
    ).toBe(true);
    expect(
      singlePlanSchema.safeParse({
        date: "2026-10-25",
        book: "John",
        chapterStart: 4,
        chapterEnd: 3,
      }).success,
    ).toBe(false);
  });

  it("limits generated plans to 365 days", () => {
    expect(
      generatePlanSchema.safeParse({
        book: "John",
        startChapter: 1,
        days: 365,
        startDate: "2026-10-25",
      }).success,
    ).toBe(true);
    expect(
      generatePlanSchema.safeParse({
        book: "John",
        startChapter: 1,
        days: 366,
        startDate: "2026-10-25",
      }).success,
    ).toBe(false);
  });
});
