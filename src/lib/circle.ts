import { cache } from "react";

import { CIRCLE_TIMEZONE, circleDateInTimeZone, isValidTimeZone } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { BibleSource } from "@/lib/bible";

export type CircleSettings = {
  name: string;
  timezone: string;
  defaultBibleSource: BibleSource;
  careInactivityDays: number;
  inviteMessageTemplate: string | null;
  available: boolean;
};

const DEFAULT_SETTINGS: CircleSettings = {
  name: "YOD Circle",
  timezone: CIRCLE_TIMEZONE,
  defaultBibleSource: "biblegateway",
  careInactivityDays: 7,
  inviteMessageTemplate: null,
  available: false,
};

type SettingsRow = {
  name: string;
  timezone: string;
  default_bible_source: BibleSource;
  care_inactivity_days: number;
  invite_message_template: string | null;
};

export const getCircleSettings = cache(async (): Promise<CircleSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("circle_settings")
      .select(
        "name, timezone, default_bible_source, care_inactivity_days, invite_message_template",
      )
      .eq("id", true)
      .maybeSingle();

    if (error || !data) return DEFAULT_SETTINGS;

    const row = data as SettingsRow;

    return {
      name: row.name,
      timezone: isValidTimeZone(row.timezone) ? row.timezone : CIRCLE_TIMEZONE,
      defaultBibleSource:
        row.default_bible_source === "youversion"
          ? "youversion"
          : "biblegateway",
      careInactivityDays: row.care_inactivity_days,
      inviteMessageTemplate: row.invite_message_template,
      available: true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export const getCircleToday = cache(async (): Promise<string> => {
  const settings = await getCircleSettings();
  return circleDateInTimeZone(new Date(), settings.timezone);
});
