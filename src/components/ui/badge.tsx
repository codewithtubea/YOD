import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "sage" | "gold" | "danger";
  size?: "sm" | "md";
};

const TONES = {
  neutral: "border-line bg-surface-soft text-ink-soft",
  sage: "border-sage/50 bg-sage-soft text-ink",
  gold: "border-gold/35 bg-gold-soft text-gold",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

const SIZES = {
  sm: "px-2 py-0.5 text-[0.6875rem]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide",
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
