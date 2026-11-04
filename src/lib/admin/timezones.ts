export function getTimeZoneOptions(preferred: string): string[] {
  let zones: string[] = [];

  try {
    if (typeof Intl.supportedValuesOf === "function") {
      zones = Intl.supportedValuesOf("timeZone");
    }
  } catch {
    zones = [];
  }

  if (zones.length === 0) {
    zones = [
      "Africa/Accra",
      "Africa/Lagos",
      "Africa/Nairobi",
      "Africa/Johannesburg",
      "Europe/London",
      "Europe/Paris",
      "America/New_York",
      "America/Chicago",
      "America/Los_Angeles",
      "Asia/Dubai",
      "Asia/Singapore",
      "Australia/Sydney",
      "UTC",
    ];
  }

  if (!zones.includes(preferred)) zones = [preferred, ...zones];
  return zones;
}
