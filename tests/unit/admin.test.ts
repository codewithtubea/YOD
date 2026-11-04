import { describe, expect, it } from "vitest";

import {
  buildMonthGrid,
  findReadingGaps,
  monthFromIso,
  readingsMap,
  shiftMonth,
} from "@/lib/admin/calendar";
import { buildInviteMessage, DEFAULT_INVITE_TEMPLATE } from "@/lib/admin/invites";
import {
  parseSermonUrl,
  sermonDomain,
  sermonThumbnail,
} from "@/lib/admin/sermons";
import { parseInviteEmails } from "@/lib/validation/admin";
import {
  adminPasswordSchema,
  announcementSchema,
  reportContentSchema,
  sermonSchema,
  settingsSchema,
} from "@/lib/validation/admin";

describe("admin invite parsing", () => {
  it("normalises, deduplicates, and separates invalid addresses", () => {
    const result = parseInviteEmails(
      " Ada@Example.com, ada@example.com \n john@example.com nope@ ",
    );

    expect(result.emails).toEqual(["ada@example.com", "john@example.com"]);
    expect(result.duplicates).toEqual(["ada@example.com"]);
    expect(result.invalid).toEqual(["nope@"]);
  });

  it("builds a plain-text message with the join link and note", () => {
    const message = buildInviteMessage({
      circleName: "YOD Circle",
      inviteUrl: "https://example.com/join?email=ada%40example.com",
      email: "ada@example.com",
      personalNote: "  Hope you can join us.  ",
    });

    expect(message).toContain("YOD Circle");
    expect(message).toContain("https://example.com/join?email=ada%40example.com");
    expect(message).toContain("ada@example.com");
    expect(message.endsWith("Hope you can join us.")).toBe(true);
  });

  it("keeps a custom template and appends the note once", () => {
    const message = buildInviteMessage({
      circleName: "YOD",
      inviteUrl: "https://example.com/join",
      email: "ada@example.com",
      personalNote: "Come as you are.",
      template: "Welcome to {circle}. Join at {link} with {email}.",
    });

    expect(message).toBe(
      "Welcome to YOD. Join at https://example.com/join with ada@example.com.\n\nCome as you are.",
    );
    expect(DEFAULT_INVITE_TEMPLATE).toContain("{circle}");
  });
});

describe("admin reading calendar", () => {
  it("builds a six-week Monday-first grid and marks today", () => {
    const grid = buildMonthGrid(
      2026,
      10,
      new Map([["2026-10-28", "John 1"]]),
      "2026-10-28",
    );

    expect(grid).toHaveLength(6);
    expect(grid.flat()).toHaveLength(42);
    expect(grid[0][0]).toMatchObject({ date: "2026-09-28", inMonth: false });
    expect(grid[0][3]).toMatchObject({
      date: "2026-10-01",
      inMonth: true,
      isToday: false,
    });
    const today = grid.flat().find((day) => day.isToday);
    expect(today).toMatchObject({ date: "2026-10-28", reference: "John 1" });
  });

  it("finds only uncovered days in the requested window", () => {
    const readings = readingsMap([
      { date: "2026-10-28", referenceText: "John 1" },
      { date: "2026-10-30", referenceText: "John 3" },
    ]);

    expect(findReadingGaps(readings, "2026-10-28", 4)).toEqual([
      "2026-10-29",
      "2026-10-31",
    ]);
  });

  it("moves across a year boundary", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthFromIso("not-a-date")).toEqual({ year: 2026, month: 1 });
  });
});

describe("admin sermon links", () => {
  it("extracts YouTube ids from common link shapes", () => {
    expect(parseSermonUrl("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({
      provider: "youtube",
      providerId: "dQw4w9WgXcQ",
    });
    expect(
      parseSermonUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=2"),
    ).toMatchObject({ provider: "youtube", providerId: "dQw4w9WgXcQ" });
    expect(
      parseSermonUrl("https://youtube.com/shorts/dQw4w9WgXcQ"),
    ).toMatchObject({ provider: "youtube", providerId: "dQw4w9WgXcQ" });
  });

  it("handles Vimeo and other domains without fetching pages", () => {
    expect(parseSermonUrl("https://vimeo.com/123456789")).toMatchObject({
      provider: "vimeo",
      providerId: "123456789",
      thumbnailUrl: null,
    });
    expect(parseSermonUrl("https://example.org/sermon")).toMatchObject({
      provider: "other",
      providerId: null,
      thumbnailUrl: null,
    });
    expect(sermonThumbnail("youtube", "dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
    expect(sermonDomain("https://www.example.org/a")).toBe("example.org");
  });

  it("rejects non-http links", () => {
    expect(
      sermonSchema.safeParse({
        title: "Sunday",
        url: "javascript:alert(1)",
        isPublished: true,
      }).success,
    ).toBe(false);
  });
});

describe("admin validation", () => {
  it("requires a real announcement title and body", () => {
    expect(
      announcementSchema.safeParse({ title: "  ", body: "A note" }).success,
    ).toBe(false);
    expect(
      announcementSchema.safeParse({ title: "A note", body: "  " }).success,
    ).toBe(false);
    expect(
      announcementSchema.safeParse({
        title: "A note",
        body: "The circle is gathering.",
        endsAt: "",
      }).success,
    ).toBe(true);
  });

  it("limits report notes and validates settings", () => {
    expect(
      reportContentSchema.safeParse({
        targetType: "post",
        targetId: "00000000-0000-4000-8000-000000000001",
        reason: "private",
        note: "x".repeat(501),
      }).success,
    ).toBe(false);

    expect(
      settingsSchema.safeParse({
        name: "YOD Circle",
        timezone: "Africa/Accra",
        defaultBibleSource: "biblegateway",
        careInactivityDays: 7,
        inviteMessageTemplate: "",
      }).success,
    ).toBe(true);
    expect(
      settingsSchema.safeParse({
        name: "YOD Circle",
        timezone: "Mars/Olympus",
        defaultBibleSource: "biblegateway",
        careInactivityDays: 7,
      }).success,
    ).toBe(false);
  });
});

describe("admin password change", () => {
  it("requires matching, different new passwords", () => {
    expect(
      adminPasswordSchema.safeParse({
        currentPassword: "old-secret",
        newPassword: "new-secret-123",
        confirmPassword: "new-secret-123",
      }).success,
    ).toBe(true);

    expect(
      adminPasswordSchema.safeParse({
        currentPassword: "old-secret",
        newPassword: "new-secret-123",
        confirmPassword: "different-123",
      }).success,
    ).toBe(false);

    expect(
      adminPasswordSchema.safeParse({
        currentPassword: "same-secret",
        newPassword: "same-secret",
        confirmPassword: "same-secret",
      }).success,
    ).toBe(false);
  });

  it("keeps the minimum password length", () => {
    expect(
      adminPasswordSchema.safeParse({
        currentPassword: "old-secret",
        newPassword: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });
});
