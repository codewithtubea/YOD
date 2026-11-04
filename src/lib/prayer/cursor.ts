export type PrayerCursor = {
  createdAt: string;
  id: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export function makePrayerCursor(createdAt: string, id: string) {
  return `${createdAt}|${id}`;
}

export function parsePrayerCursor(value: string | null | undefined) {
  if (!value) return null;

  const separator = value.lastIndexOf("|");
  if (separator <= 0 || separator === value.length - 1) return null;

  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);

  if (!UUID_PATTERN.test(id)) return null;
  if (!TIMESTAMP_PATTERN.test(createdAt)) return null;
  if (Number.isNaN(Date.parse(createdAt))) return null;

  return { createdAt, id } satisfies PrayerCursor;
}
