"use client";

import { m } from "motion/react";

import { Candle } from "@/components/art/candle";
import { cn } from "@/lib/cn";

type CircleCandlesProps = {
  total?: number;
  lit?: number;
  label?: string;
  className?: string;
};

export function CircleCandles({
  total = 7,
  lit = 3,
  label = "Candles lit in the circle",
  className,
}: CircleCandlesProps) {
  const safeLit = Math.min(Math.max(lit, 0), total);

  return (
    <div
      role="img"
      aria-label={`${label}: ${safeLit} of ${total}`}
      className={cn(
        "inline-flex items-end gap-2 rounded-soft border border-line bg-surface/70 px-4 py-3",
        className,
      )}
    >
      {Array.from({ length: total }, (_, index) => {
        const isLit = index < safeLit;
        return (
          <m.span
            key={index}
            aria-hidden
            initial={false}
            animate={{ opacity: isLit ? 1 : 0.35 }}
            transition={{ duration: 0.48, delay: isLit ? index * 0.05 : 0 }}
            className={cn(
              "inline-flex",
              index % 2 === 0 ? "translate-y-0" : "translate-y-1",
              isLit ? "text-gold" : "text-ink-soft",
            )}
          >
            <Candle size={18} lit={isLit} />
          </m.span>
        );
      })}
    </div>
  );
}
