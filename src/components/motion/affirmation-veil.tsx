"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";

type AffirmationVeilProps = {
  children: ReactNode;
  label?: string;
  className?: string;
  revealed?: boolean;
  onReveal?: () => void;
};

export function AffirmationVeil({
  children,
  label = "Tap to receive today's affirmation",
  className,
  revealed,
  onReveal,
}: AffirmationVeilProps) {
  const [localRevealed, setLocalRevealed] = useState(false);
  const reduceMotion = useReducedMotion();
  const isRevealed = revealed ?? localRevealed;

  function reveal() {
    if (revealed === undefined) setLocalRevealed(true);
    onReveal?.();
  }

  return (
    <div className={cn("relative overflow-hidden rounded-card", className)}>
      <m.div
        aria-hidden={!isRevealed}
        inert={!isRevealed}
        initial={false}
        animate={{ opacity: isRevealed ? 1 : 0.18 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative"
      >
        {children}
      </m.div>

      <AnimatePresence initial={false}>
        {!isRevealed ? (
          <m.button
            key="veil"
            type="button"
            onClick={reveal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24 }}
            aria-label={label}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-card border border-gold/20 bg-canvas/75 px-5 text-center backdrop-blur-[2px] transition-colors duration-quick hover:bg-canvas/65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-full border border-gold/40 bg-gold-soft/60 text-gold"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </span>
            <span className="text-sm font-medium text-ink">Tap to reveal</span>
            <span className="max-w-xs text-xs leading-relaxed text-ink-soft">
              A quiet word for today is waiting.
            </span>
          </m.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
