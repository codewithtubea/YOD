"use client";

import type { ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";

import { Dove } from "@/components/art/dove";
import { cn } from "@/lib/cn";

type PostAscendProps = {
  active: boolean;
  children: ReactNode;
  onComplete?: () => void;
  className?: string;
};

export function PostAscend({
  active,
  children,
  onComplete,
  className,
}: PostAscendProps) {
  return (
    <div className={cn("relative", className)}>
      <m.div
        animate={
          active ? { opacity: 0, y: -72, scale: 0.985 } : { opacity: 1, y: 0 }
        }
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => {
          if (active) onComplete?.();
        }}
      >
        {children}
      </m.div>

      <AnimatePresence>
        {active ? (
          <m.span
            aria-hidden
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.85, 0], y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute right-4 top-2 text-gold"
          >
            <Dove size={24} flap="up" />
          </m.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
