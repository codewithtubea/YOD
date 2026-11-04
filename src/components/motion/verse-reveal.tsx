"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";

import { cn } from "@/lib/cn";

type VerseRevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function VerseReveal({ children, delay = 0, className }: VerseRevealProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(className)}
    >
      {children}
    </m.div>
  );
}
