"use client";

import { m } from "motion/react";

import { GuardianWings } from "@/components/art/guardian-wings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type GuardianAngelProps = {
  line: string;
  onDismiss?: () => void;
  className?: string;
};

export function GuardianAngel({
  line,
  onDismiss,
  className,
}: GuardianAngelProps) {
  return (
    <m.div
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-surface px-6 py-7 text-center shadow-soft",
        className,
      )}
    >
      <div className="mx-auto flex justify-center">
        <GuardianWings size={64} animated />
      </div>
      <p className="type-scripture mt-4 text-ink">{line}</p>
      {onDismiss ? (
        <Button variant="ghost" size="sm" onClick={onDismiss} className="mt-4">
          Thank you
        </Button>
      ) : null}
    </m.div>
  );
}
