export const CIRCLE_TIMEZONE = "Africa/Accra";

export function formatCircleDate(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: CIRCLE_TIMEZONE,
  }).format(date);
}
