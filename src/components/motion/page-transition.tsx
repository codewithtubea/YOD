"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";

import { cn } from "@/lib/cn";

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </m.div>
  );
}
