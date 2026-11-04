"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";

import { Candle } from "@/components/art/candle";
import { cn } from "@/lib/cn";
import { useSoftChime } from "./sound-preference";

type CandleLightProps = {
  defaultLit?: boolean;
  active?: boolean;
  litLabel?: string;
  unlitLabel?: string;
  label?: string;
  disabled?: boolean;
  onLight?: () => void;
  onToggle?: (next: boolean) => void;
  className?: string;
};

export function CandleLight({
  defaultLit = false,
  active,
  litLabel = "Candle lit",
  unlitLabel = "Light a candle",
  label,
  disabled,
  onLight,
  onToggle,
  className,
}: CandleLightProps) {
  const [internalLit, setInternalLit] = useState(defaultLit);
  const lit = active ?? internalLit;
  const { play } = useSoftChime();

  function light() {
    if (disabled) return;
    const next = !lit;
    if (active === undefined) setInternalLit(next);
    if (next) {
      play();
      onLight?.();
    }
    onToggle?.(next);
  }

  return (
    <button
      type="button"
      aria-pressed={lit}
      disabled={disabled}
      onClick={light}
      className={cn(
        "group relative inline-flex min-h-11 items-center gap-3 rounded-full border px-4 text-sm font-medium transition duration-quick ease-settle active:scale-[0.98] motion-reduce:active:scale-100",
        lit
          ? "border-gold/40 bg-gold-soft/50 text-ink"
          : "border-line bg-surface text-ink-soft hover:border-gold/40 hover:text-ink",
        className,
      )}
    >
      <span className="relative inline-flex size-7 items-center justify-center">
        <AnimatePresence>
          {lit ? (
            <m.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 0.18, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-0 rounded-full bg-gold blur-md"
            />
          ) : null}
        </AnimatePresence>
        <Candle
          size={26}
          lit={lit}
          animated={lit}
          className="relative text-gold"
        />
      </span>
      <span>{lit ? litLabel : (label ?? unlitLabel)}</span>
    </button>
  );
}
