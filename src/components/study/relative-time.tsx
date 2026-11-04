"use client";

import { useEffect, useState } from "react";

import { formatPlanDate } from "@/lib/date";

function label(value: string, now: number) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 45) return "just now";
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60 * 60) {
    return formatter.format(Math.round(seconds / 60), "minute");
  }
  if (abs < 60 * 60 * 24) {
    return formatter.format(Math.round(seconds / (60 * 60)), "hour");
  }
  if (abs < 60 * 60 * 24 * 7) {
    return formatter.format(Math.round(seconds / (60 * 60 * 24)), "day");
  }

  return formatPlanDate(value.slice(0, 10), false);
}

export function RelativeTime({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => setText(label(value, Date.now()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [value]);

  return (
    <time dateTime={value} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
