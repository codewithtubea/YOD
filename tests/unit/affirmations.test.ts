import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { detectImageType } from "@/lib/affirmations/images";
import {
  affirmationPreview,
  formatAffirmationDate,
  groupAffirmationsByMonth,
} from "@/lib/affirmations/format";
import { useAffirmationReveal } from "@/lib/affirmations/use-reveal";
import type { AffirmationItem } from "@/lib/affirmations/types";
import {
  archiveAffirmationSchema,
  saveAffirmationSchema,
} from "@/lib/validation/affirmations";

function item(
  id: string,
  publishDate: string,
  body = "A quiet word.",
): AffirmationItem {
  return {
    id,
    publishDate,
    body,
    scriptureRef: null,
    amenCount: 0,
    viewerSaved: false,
  };
}

describe("affirmation validation", () => {
  it("trims a scheduled affirmation and accepts an empty reference", () => {
    const result = saveAffirmationSchema.safeParse({
      body: "  Be still.  ",
      scriptureRef: "  ",
      status: "scheduled",
      publishDate: "2026-10-29",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toBe("Be still.");
      expect(result.data.scriptureRef).toBeNull();
      expect(result.data.publishDate).toBe("2026-10-29");
    }
  });

  it("requires a real day for a scheduled affirmation", () => {
    const missing = saveAffirmationSchema.safeParse({
      body: "Be still.",
      status: "scheduled",
      publishDate: "",
    });
    const invalid = saveAffirmationSchema.safeParse({
      body: "Be still.",
      status: "scheduled",
      publishDate: "2026-02-31",
    });

    expect(missing.success).toBe(false);
    expect(invalid.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues.some((issue) => issue.path[0] === "publishDate")).toBe(true);
    }
  });

  it("allows a draft without a day", () => {
    expect(
      saveAffirmationSchema.safeParse({
        body: "A word held for later.",
        status: "draft",
        publishDate: null,
      }).success,
    ).toBe(true);
  });

  it("requires alt text when an image is attached", () => {
    const result = saveAffirmationSchema.safeParse({
      body: "Be still.",
      status: "scheduled",
      publishDate: "2026-10-29",
      imagePath: "user/image.jpg",
      imageAlt: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "imageAlt")).toBe(true);
    }
  });

  it("validates affirmation ids", () => {
    expect(
      archiveAffirmationSchema.safeParse({
        id: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
    expect(archiveAffirmationSchema.safeParse({ id: "nope" }).success).toBe(false);
  });
});

describe("affirmation image detection", () => {
  it("detects the three allowed formats from their bytes", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      detectImageType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(
      detectImageType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      ),
    ).toBe("image/webp");
  });

  it("rejects anything else", () => {
    expect(detectImageType(new TextEncoder().encode("hello"))).toBeNull();
  });
});

describe("affirmation formatting", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("formats a day in the circle calendar", () => {
    expect(formatAffirmationDate("2026-10-29")).toBe("29 October");
    expect(formatAffirmationDate("2026-10-29", true)).toBe("29 October 2026");
  });

  it("groups saved lines by month without reordering", () => {
    const months = groupAffirmationsByMonth([
      item("1", "2026-10-29"),
      item("2", "2026-10-01"),
      item("3", "2026-09-30"),
    ]);

    expect(months.map((month) => month.label)).toEqual([
      "October 2026",
      "September 2026",
    ]);
    expect(months[0].items.map((entry) => entry.id)).toEqual(["1", "2"]);
  });

  it("shortens a long preview with an ellipsis", () => {
    expect(affirmationPreview("short words", 20)).toBe("short words");
    expect(affirmationPreview("one two three four five", 12)).toBe("one two thr…");
  });

  it("remembers a revealed affirmation in storage", () => {
    const { result, unmount } = renderHook(() =>
      useAffirmationReveal("yod.affirmation.revealed.test"),
    );

    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(
      window.localStorage.getItem("yod.affirmation.revealed.test"),
    ).toBe("revealed");
    unmount();
  });
});
