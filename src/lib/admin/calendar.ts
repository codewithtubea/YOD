import { addDaysToIsoDate, parseIsoDate } from "@/lib/date";

export type CalendarDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  reference: string | null;
};

export type CalendarWeek = CalendarDay[];

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function buildMonthGrid(
  year: number,
  month: number,
  readings: Map<string, string>,
  today: string,
): CalendarWeek[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;

  const cells: CalendarDay[] = [];
  const start = new Date(Date.UTC(year, month - 1, 1 - mondayOffset));

  for (let index = 0; index < 42; index += 1) {
    const cursor = new Date(start);
    cursor.setUTCDate(start.getUTCDate() + index);
    const date = iso(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + 1,
      cursor.getUTCDate(),
    );

    cells.push({
      date,
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() + 1 === month,
      isToday: date === today,
      reference: readings.get(date) ?? null,
    });
  }

  const weeks: CalendarWeek[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function findReadingGaps(
  readings: Map<string, string>,
  fromDate: string,
  days: number,
): string[] {
  const gaps: string[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = addDaysToIsoDate(fromDate, index);
    if (!date || !parseIsoDate(date)) break;
    if (!readings.has(date)) gaps.push(date);
  }
  return gaps;
}

export function readingsMap(
  plans: { date: string; referenceText: string }[],
): Map<string, string> {
  return new Map(plans.map((plan) => [plan.date, plan.referenceText]));
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthFromIso(value: string): { year: number; month: number } {
  const safe = parseIsoDate(value) ?? "2026-01-01";
  const [year, month] = safe.split("-").map(Number);
  return { year, month };
}
