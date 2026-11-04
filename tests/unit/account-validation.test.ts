import { describe, expect, it } from "vitest";

import {
  avatarPathSchema,
  deleteAccountSchema,
  memberSettingsSchema,
  profileSchema,
} from "@/lib/validation/account";

const userId = "11111111-1111-4111-8111-111111111111";

describe("profile validation", () => {
  it("trims names and turns an empty bio into null", () => {
    expect(
      profileSchema.parse({ displayName: "  Ama  ", bio: "   " }),
    ).toEqual({ displayName: "Ama", bio: null });
  });

  it("rejects an empty name and an overlong bio", () => {
    expect(
      profileSchema.safeParse({ displayName: " ", bio: "fine" }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        displayName: "Ama",
        bio: "x".repeat(161),
      }).success,
    ).toBe(false);
  });
});

describe("avatar path validation", () => {
  it("only accepts a file inside the member's own folder", () => {
    expect(avatarPathSchema.safeParse(`${userId}/photo.webp`).success).toBe(
      true,
    );
    expect(avatarPathSchema.safeParse("someone-else/photo.webp").success).toBe(
      false,
    );
    expect(avatarPathSchema.safeParse(`${userId}/../photo.webp`).success).toBe(
      false,
    );
  });
});

describe("member settings validation", () => {
  it("allows appearance-only updates without resetting notification choices", () => {
    expect(
      memberSettingsSchema.parse({
        theme: "dark",
        reduceMotion: true,
        textSize: "large",
      }),
    ).toEqual({ theme: "dark", reduceMotion: true, textSize: "large" });
  });

  it("accepts notification preference updates", () => {
    expect(
      memberSettingsSchema.parse({
        theme: "system",
        reduceMotion: false,
        textSize: "default",
        notifyReplies: false,
        notifyAmens: true,
        notifyAnswered: false,
      }),
    ).toMatchObject({
      notifyReplies: false,
      notifyAmens: true,
      notifyAnswered: false,
    });
  });
});

describe("delete account validation", () => {
  it("requires a proof, a decision, and the exact confirmation", () => {
    expect(
      deleteAccountSchema.safeParse({
        proofId: userId,
        keepContributions: true,
        confirmation: "DELETE",
      }).success,
    ).toBe(true);
    expect(
      deleteAccountSchema.safeParse({
        proofId: userId,
        keepContributions: true,
        confirmation: "delete",
      }).success,
    ).toBe(false);
  });
});
