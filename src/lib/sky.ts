import { CIRCLE_TIMEZONE } from "@/lib/date";

export type SkyPeriod = "dawn" | "morning" | "afternoon" | "dusk" | "night";

const HOUR_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function hourInTimeZone(date: Date, timeZone: string) {
  let formatter = HOUR_FORMATTERS.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone,
    });
    HOUR_FORMATTERS.set(timeZone, formatter);
  }

  return Number.parseInt(formatter.format(date), 10);
}

/**
 * Dawn 05:00–07:59, morning 08:00–11:59, afternoon 12:00–16:59,
 * dusk 17:00–19:59, night 20:00–04:59.
 */
export function getSkyPeriod(
  date: Date = new Date(),
  timeZone: string = CIRCLE_TIMEZONE,
): SkyPeriod {
  const hour = hourInTimeZone(date, timeZone);

  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}
