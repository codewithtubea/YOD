import { addDaysToIsoDate, parseIsoDate } from "@/lib/date";

export type BibleSource = "biblegateway" | "youversion";

export type BibleBook = {
  name: string;
  chapters: number;
  code: string;
  aliases?: string[];
};

export const BIBLE_BOOKS: BibleBook[] = [
  { name: "Genesis", chapters: 50, code: "GEN", aliases: ["Gen"] },
  { name: "Exodus", chapters: 40, code: "EXO", aliases: ["Exod", "Ex"] },
  { name: "Leviticus", chapters: 27, code: "LEV", aliases: ["Lev"] },
  { name: "Numbers", chapters: 36, code: "NUM", aliases: ["Num"] },
  { name: "Deuteronomy", chapters: 34, code: "DEU", aliases: ["Deut", "Dt"] },
  { name: "Joshua", chapters: 24, code: "JOS", aliases: ["Josh"] },
  { name: "Judges", chapters: 21, code: "JDG", aliases: ["Judg"] },
  { name: "Ruth", chapters: 4, code: "RUT" },
  { name: "1 Samuel", chapters: 31, code: "1SA", aliases: ["1 Sam"] },
  { name: "2 Samuel", chapters: 24, code: "2SA", aliases: ["2 Sam"] },
  { name: "1 Kings", chapters: 22, code: "1KI", aliases: ["1 Kgs"] },
  { name: "2 Kings", chapters: 25, code: "2KI", aliases: ["2 Kgs"] },
  { name: "1 Chronicles", chapters: 29, code: "1CH", aliases: ["1 Chron", "1 Chr"] },
  { name: "2 Chronicles", chapters: 36, code: "2CH", aliases: ["2 Chron", "2 Chr"] },
  { name: "Ezra", chapters: 10, code: "EZR" },
  { name: "Nehemiah", chapters: 13, code: "NEH", aliases: ["Neh"] },
  { name: "Esther", chapters: 10, code: "EST", aliases: ["Esth"] },
  { name: "Job", chapters: 42, code: "JOB" },
  { name: "Psalms", chapters: 150, code: "PSA", aliases: ["Psalm", "Ps"] },
  { name: "Proverbs", chapters: 31, code: "PRO", aliases: ["Prov"] },
  { name: "Ecclesiastes", chapters: 12, code: "ECC", aliases: ["Eccl", "Ecc"] },
  { name: "Song of Solomon", chapters: 8, code: "SNG", aliases: ["Song of Songs", "Song", "Canticles"] },
  { name: "Isaiah", chapters: 66, code: "ISA", aliases: ["Isa"] },
  { name: "Jeremiah", chapters: 52, code: "JER", aliases: ["Jer"] },
  { name: "Lamentations", chapters: 5, code: "LAM", aliases: ["Lam"] },
  { name: "Ezekiel", chapters: 48, code: "EZK", aliases: ["Ezek", "Eze"] },
  { name: "Daniel", chapters: 12, code: "DAN", aliases: ["Dan"] },
  { name: "Hosea", chapters: 14, code: "HOS", aliases: ["Hos"] },
  { name: "Joel", chapters: 3, code: "JOL" },
  { name: "Amos", chapters: 9, code: "AMO" },
  { name: "Obadiah", chapters: 1, code: "OBA", aliases: ["Obad"] },
  { name: "Jonah", chapters: 4, code: "JON" },
  { name: "Micah", chapters: 7, code: "MIC", aliases: ["Mic"] },
  { name: "Nahum", chapters: 3, code: "NAM", aliases: ["Nah"] },
  { name: "Habakkuk", chapters: 3, code: "HAB", aliases: ["Hab"] },
  { name: "Zephaniah", chapters: 3, code: "ZEP", aliases: ["Zeph"] },
  { name: "Haggai", chapters: 2, code: "HAG", aliases: ["Hag"] },
  { name: "Zechariah", chapters: 14, code: "ZEC", aliases: ["Zech"] },
  { name: "Malachi", chapters: 4, code: "MAL", aliases: ["Mal"] },
  { name: "Matthew", chapters: 28, code: "MAT", aliases: ["Matt", "Mt"] },
  { name: "Mark", chapters: 16, code: "MRK", aliases: ["Mk"] },
  { name: "Luke", chapters: 24, code: "LUK", aliases: ["Lk"] },
  { name: "John", chapters: 21, code: "JHN", aliases: ["Jn"] },
  { name: "Acts", chapters: 28, code: "ACT" },
  { name: "Romans", chapters: 16, code: "ROM", aliases: ["Rom"] },
  { name: "1 Corinthians", chapters: 16, code: "1CO", aliases: ["1 Cor"] },
  { name: "2 Corinthians", chapters: 13, code: "2CO", aliases: ["2 Cor"] },
  { name: "Galatians", chapters: 6, code: "GAL", aliases: ["Gal"] },
  { name: "Ephesians", chapters: 6, code: "EPH", aliases: ["Eph"] },
  { name: "Philippians", chapters: 4, code: "PHP", aliases: ["Phil"] },
  { name: "Colossians", chapters: 4, code: "COL", aliases: ["Col"] },
  { name: "1 Thessalonians", chapters: 5, code: "1TH", aliases: ["1 Thess"] },
  { name: "2 Thessalonians", chapters: 3, code: "2TH", aliases: ["2 Thess"] },
  { name: "1 Timothy", chapters: 6, code: "1TI", aliases: ["1 Tim"] },
  { name: "2 Timothy", chapters: 4, code: "2TI", aliases: ["2 Tim"] },
  { name: "Titus", chapters: 3, code: "TIT" },
  { name: "Philemon", chapters: 1, code: "PHM", aliases: ["Philem"] },
  { name: "Hebrews", chapters: 13, code: "HEB", aliases: ["Heb"] },
  { name: "James", chapters: 5, code: "JAS", aliases: ["Jas"] },
  { name: "1 Peter", chapters: 5, code: "1PE", aliases: ["1 Pet"] },
  { name: "2 Peter", chapters: 3, code: "2PE", aliases: ["2 Pet"] },
  { name: "1 John", chapters: 5, code: "1JN", aliases: ["1 Jn"] },
  { name: "2 John", chapters: 1, code: "2JN", aliases: ["2 Jn"] },
  { name: "3 John", chapters: 1, code: "3JN", aliases: ["3 Jn"] },
  { name: "Jude", chapters: 1, code: "JUD" },
  { name: "Revelation", chapters: 22, code: "REV", aliases: ["Rev", "Revelations"] },
];

export const BIBLE_SOURCES: { id: BibleSource; label: string }[] = [
  { id: "biblegateway", label: "BibleGateway" },
  { id: "youversion", label: "YouVersion" },
];

const BOOK_BY_KEY = new Map<string, BibleBook>();

function key(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

for (const book of BIBLE_BOOKS) {
  BOOK_BY_KEY.set(key(book.name), book);
  BOOK_BY_KEY.set(key(book.code), book);
  for (const alias of book.aliases ?? []) {
    BOOK_BY_KEY.set(key(alias), book);
  }
}

export function findBibleBook(value: string): BibleBook | null {
  return BOOK_BY_KEY.get(key(value)) ?? null;
}

export function formatReference(
  book: string,
  chapterStart: number,
  chapterEnd?: number | null,
) {
  if (chapterEnd && chapterEnd !== chapterStart) {
    return `${book} ${chapterStart}–${chapterEnd}`;
  }
  return `${book} ${chapterStart}`;
}

export function buildBibleUrl(
  source: BibleSource,
  book: string,
  chapterStart: number,
  chapterEnd?: number | null,
) {
  const reference = `${book} ${chapterStart}${
    chapterEnd && chapterEnd !== chapterStart ? `-${chapterEnd}` : ""
  }`;

  if (source === "youversion") {
    const found = findBibleBook(book);
    if (found && (!chapterEnd || chapterEnd === chapterStart)) {
      return `https://www.bible.com/bible/111/${found.code}.${chapterStart}`;
    }
    return `https://www.bible.com/search/bible?q=${encodeURIComponent(reference)}`;
  }

  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}`;
}

export type ParsedPlanEntry = {
  line: number;
  date: string;
  book: string;
  chapterStart: number;
  chapterEnd: number | null;
  referenceText: string;
};

export type PlanLineError = {
  line: number;
  message: string;
};

export type ParsePlanResult = {
  entries: ParsedPlanEntry[];
  errors: PlanLineError[];
};

export function parsePlanLine(
  raw: string,
  line: number,
): ParsedPlanEntry | PlanLineError {
  const cleaned = raw.trim();
  if (!cleaned) return { line, message: "Empty line." };

  const pieces = cleaned.split(",");
  if (pieces.length !== 2) {
    return {
      line,
      message: "Use the format YYYY-MM-DD, Book Chapter (for example, 2026-11-02, John 3).",
    };
  }

  const date = parseIsoDate(pieces[0].trim());
  if (!date) {
    return { line, message: "Enter a real date in YYYY-MM-DD format." };
  }

  const reading = pieces[1].trim();
  const match = /^(.+?)\s+(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(reading);
  if (!match) {
    return { line, message: "Enter a book and chapter, for example John 3 or John 3-4." };
  }

  const book = findBibleBook(match[1]);
  if (!book) {
    return { line, message: `“${match[1]}” is not a recognised Bible book.` };
  }

  const chapterStart = Number(match[2]);
  const chapterEnd = match[3] ? Number(match[3]) : null;

  if (!Number.isInteger(chapterStart) || chapterStart < 1) {
    return { line, message: "The starting chapter must be a whole number." };
  }

  if (chapterStart > book.chapters) {
    return {
      line,
      message: `${book.name} has ${book.chapters} chapter${book.chapters === 1 ? "" : "s"}.`,
    };
  }

  if (chapterEnd !== null) {
    if (!Number.isInteger(chapterEnd) || chapterEnd < chapterStart) {
      return { line, message: "The ending chapter must be on or after the starting chapter." };
    }
    if (chapterEnd > book.chapters) {
      return {
        line,
        message: `${book.name} has ${book.chapters} chapter${book.chapters === 1 ? "" : "s"}.`,
      };
    }
  }

  return {
    line,
    date,
    book: book.name,
    chapterStart,
    chapterEnd,
    referenceText: formatReference(book.name, chapterStart, chapterEnd),
  };
}

export function parsePlanText(raw: string): ParsePlanResult {
  const entries: ParsedPlanEntry[] = [];
  const errors: PlanLineError[] = [];
  const seenDates = new Map<string, number>();

  raw.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;

    const result = parsePlanLine(line, index + 1);

    if ("message" in result) {
      errors.push(result);
      return;
    }

    const firstLine = seenDates.get(result.date);
    if (firstLine) {
      errors.push({
        line: result.line,
        message: `This date is already used on line ${firstLine}.`,
      });
      return;
    }

    seenDates.set(result.date, result.line);
    entries.push(result);
  });

  if (entries.length === 0 && errors.length === 0) {
    errors.push({ line: 1, message: "Add at least one reading." });
  }

  return { entries, errors };
}

export type GeneratePlanInput = {
  book: string;
  startChapter: number;
  days: number;
  startDate: string;
};

export type GeneratePlanResult =
  | { ok: true; entries: ParsedPlanEntry[] }
  | { ok: false; message: string };

export function generatePlanEntries(
  input: GeneratePlanInput,
): GeneratePlanResult {
  const book = findBibleBook(input.book);
  if (!book) return { ok: false, message: "Choose a recognised Bible book." };

  if (!parseIsoDate(input.startDate)) {
    return { ok: false, message: "Choose a real start date." };
  }

  if (!Number.isInteger(input.startChapter) || input.startChapter < 1) {
    return { ok: false, message: "Choose a valid starting chapter." };
  }

  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 365) {
    return { ok: false, message: "Choose between 1 and 365 days." };
  }

  const endChapter = input.startChapter + input.days - 1;
  if (endChapter > book.chapters) {
    return {
      ok: false,
      message: `${book.name} has ${book.chapters} chapter${
        book.chapters === 1 ? "" : "s"
      }; this plan needs ${input.startChapter + input.days - 1}.`,
    };
  }

  const entries: ParsedPlanEntry[] = [];

  for (let index = 0; index < input.days; index += 1) {
    const chapter = input.startChapter + index;
    const date = addDaysToIsoDate(input.startDate, index);
    if (!date) return { ok: false, message: "The generated date was invalid." };

    entries.push({
      line: index + 1,
      date,
      book: book.name,
      chapterStart: chapter,
      chapterEnd: null,
      referenceText: formatReference(book.name, chapter),
    });
  }

  return { ok: true, entries };
}
