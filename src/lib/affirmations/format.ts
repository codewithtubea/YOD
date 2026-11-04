import type { AffirmationItem, AffirmationMonth } from "./types";

export function formatAffirmationDate(value: string, withYear = false) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function affirmationMonthKey(value: string) {
  return value.slice(0, 7);
}

export function groupAffirmationsByMonth(
  items: AffirmationItem[],
): AffirmationMonth[] {
  const months = new Map<string, AffirmationMonth>();

  for (const item of items) {
    const key = affirmationMonthKey(item.publishDate);
    const [year, month] = key.split("-").map(Number);
    const label = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    const existing = months.get(key);
    if (existing) existing.items.push(item);
    else months.set(key, { key, label, items: [item] });
  }

  return [...months.values()];
}

export function affirmationPreview(body: string, max = 96) {
  const firstLine = body.split(/\s+/).join(" ").trim();
  if (firstLine.length <= max) return firstLine;
  return `${firstLine.slice(0, max - 1).trimEnd()}…`;
}
