import type { CheckInMood } from "@/lib/validation/check-in";

export const CHECK_IN_MOOD_OPTIONS: {
  id: CheckInMood;
  label: string;
  description: string;
}[] = [
  {
    id: "grateful",
    label: "Grateful",
    description: "There is something to thank God for this week.",
  },
  {
    id: "steady",
    label: "Steady",
    description: "Held, even if the week has been ordinary.",
  },
  {
    id: "heavy",
    label: "Heavy",
    description: "This week is carrying more weight than usual.",
  },
  {
    id: "resting",
    label: "Resting",
    description: "Low on words, but still here with the circle.",
  },
];

const MOOD_LABELS: Record<CheckInMood, string> = {
  grateful: "Grateful",
  steady: "Steady",
  heavy: "Heavy",
  resting: "Resting",
};

export function moodLabel(mood: CheckInMood | null | undefined) {
  return mood ? MOOD_LABELS[mood] : "Not checked in";
}

export function formatWeekRange(weekStart: string) {
  const start = parseDate(weekStart);
  if (!start) return weekStart;

  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

  const startLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);

  return `${startLabel} – ${endLabel}`;
}

export function presencePercent(checkedIn: number, circleSize: number) {
  if (circleSize <= 0) return 0;
  return Math.min(100, Math.round((checkedIn / circleSize) * 100));
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
