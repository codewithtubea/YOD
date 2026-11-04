"use client";

import { useEffect } from "react";

import { useMotionPreference } from "@/components/motion/motion-preference";
import { useTextSize } from "@/components/text-size-provider";
import { useTheme } from "@/components/theme-provider";
import type { MemberSettings } from "@/lib/account/types";

export function MemberPreferencesSync({
  settings,
}: {
  settings: MemberSettings;
}) {
  const { setMode } = useTheme();
  const { setReduceMotion } = useMotionPreference();
  const { setTextSize } = useTextSize();

  useEffect(() => {
    if (!settings.hasRow || !settings.available) return;

    setMode(settings.theme);
    setReduceMotion(settings.reduceMotion);
    setTextSize(settings.textSize);
  }, [settings, setMode, setReduceMotion, setTextSize]);

  return null;
}
