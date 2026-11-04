import { describe, expect, it } from "vitest";

import {
  BIBLE_BOOKS,
  buildBibleUrl,
  findBibleBook,
  formatReference,
  generatePlanEntries,
  parsePlanLine,
  parsePlanText,
} from "@/lib/bible";

describe("Bible references", () => {
  it("contains all 66 books and resolves aliases", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(findBibleBook("Psalm")?.name).toBe("Psalms");
    expect(findBibleBook("1 Cor")?.name).toBe("1 Corinthians");
    expect(findBibleBook("song of songs")?.name).toBe("Song of Solomon");
    expect(findBibleBook("not a book")).toBeNull();
  });

  it("formats a single chapter and a range", () => {
    expect(formatReference("John", 3)).toBe("John 3");
    expect(formatReference("John", 3, 3)).toBe("John 3");
    expect(formatReference("John", 3, 4)).toBe("John 3–4");
  });

  it("builds outbound links without reproducing passage text", () => {
    expect(buildBibleUrl("biblegateway", "John", 3, 4)).toBe(
      "https://www.biblegateway.com/passage/?search=John%203-4",
    );
    expect(buildBibleUrl("youversion", "Psalms", 23, null)).toBe(
      "https://www.bible.com/bible/111/PSA.23",
    );
    expect(buildBibleUrl("youversion", "John", 3, 4)).toBe(
      "https://www.bible.com/search/bible?q=John%203-4",
    );
  });

  it("parses one plan line and validates chapter bounds", () => {
    const valid = parsePlanLine("2026-11-02, John 3-4", 1);
    expect("message" in valid).toBe(false);
    if ("message" in valid) return;
    expect(valid).toMatchObject({
      date: "2026-11-02",
      book: "John",
      chapterStart: 3,
      chapterEnd: 4,
      referenceText: "John 3–4",
    });

    const tooHigh = parsePlanLine("2026-11-02, John 22", 2);
    expect("message" in tooHigh && tooHigh.message).toContain("21 chapters");

    const badDate = parsePlanLine("2026-02-30, John 1", 3);
    expect("message" in badDate && badDate.message).toContain("real date");
  });

  it("rejects duplicate dates and returns line errors", () => {
    const result = parsePlanText(
      "2026-11-02, John 1\n2026-11-02, John 2\n2026-11-03, Nope 1",
    );

    expect(result.entries).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].message).toContain("already used on line 1");
  });

  it("requires at least one reading", () => {
    const result = parsePlanText("   \n\n");
    expect(result.entries).toHaveLength(0);
    expect(result.errors[0].message).toContain("at least one reading");
  });

  it("generates sequential readings across a year boundary", () => {
    const result = generatePlanEntries({
      book: "John",
      startChapter: 1,
      days: 7,
      startDate: "2026-12-29",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(7);
    expect(result.entries[0]).toMatchObject({
      date: "2026-12-29",
      referenceText: "John 1",
    });
    expect(result.entries[6]).toMatchObject({
      date: "2027-01-04",
      referenceText: "John 7",
    });
  });

  it("refuses a generated plan longer than the book", () => {
    const result = generatePlanEntries({
      book: "Jude",
      startChapter: 1,
      days: 2,
      startDate: "2026-12-29",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("1 chapter;");
  });
});
