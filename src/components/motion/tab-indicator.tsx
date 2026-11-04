import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

type TabIndicatorProps = {
  index: number;
  count: number;
  className?: string;
};

export function TabIndicator({ index, count, className }: TabIndicatorProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "tab-indicator pointer-events-none absolute left-0 h-0.5 bg-gold",
        className,
      )}
      style={
        {
          "--tab-count": count,
          "--tab-index": index,
        } as CSSProperties
      }
    />
  );
}
