"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

type AnsweredRevealProps = {
  children: ReactNode;
  answered?: boolean;
  className?: string;
};

export function AnsweredReveal({
  children,
  answered = false,
  className,
}: AnsweredRevealProps) {
  return (
    <div className={cn("relative", className)}>
      {answered ? (
        <m.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute -inset-2 rounded-card bg-gold/10 shadow-lg shadow-gold/10 ring-1 ring-gold/25"
        />
      ) : null}

      <div className="relative">{children}</div>

      {answered ? (
        <m.div
          role="status"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-3 flex justify-end"
        >
          <Badge tone="gold" size="md">
            <span className="size-1.5 rounded-full bg-gold" aria-hidden />
            Answered
          </Badge>
        </m.div>
      ) : null}
    </div>
  );
}
