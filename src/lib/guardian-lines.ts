import { CIRCLE_TIMEZONE } from "@/lib/date";

export const GUARDIAN_LINES = [
  "You are seen.",
  "Rest is also faithfulness.",
  "Small steps still count.",
  "You don't have to carry it alone.",
  "Grace is already here.",
  "Breathe. You are held.",
  "Today doesn't need to be perfect.",
  "There is room for you here.",
  "Your quiet faithfulness matters.",
  "You can begin again.",
  "Let the next small thing be enough.",
  "You are loved, not measured.",
  "Stay gentle with yourself.",
  "Light finds a way in.",
  "Peace can be a small thing.",
] as const;

export type GuardianLine = (typeof GUARDIAN_LINES)[number];

/**
 * Picks a stable line for the local calendar day. The caller decides when the
 * guardian is shown; this function does not read or write storage.
 */
export function getGuardianLineForDate(
  date: Date = new Date(),
  timeZone = CIRCLE_TIMEZONE,
): GuardianLine {
  const day = new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);

  let hash = 0;
  for (let index = 0; index < day.length; index += 1) {
    hash = (hash * 31 + day.charCodeAt(index)) >>> 0;
  }

  return GUARDIAN_LINES[hash % GUARDIAN_LINES.length];
}
