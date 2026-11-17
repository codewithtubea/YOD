import type { ReactNode } from "react";

import { LivingSky } from "@/components/motion/living-sky";
import { getSkyPeriod } from "@/lib/sky";

export function AuthScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <LivingSky
        contained
        period={getSkyPeriod()}
        className="opacity-80"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            YOD Circle
          </p>
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft/70">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        </div>

        {children}

        <p className="mx-auto mt-8 max-w-xs text-center text-xs leading-relaxed text-ink-soft/80">
          A private circle. New accounts wait for a gentle admin approval
          before they can enter.
        </p>
      </div>
    </main>
  );
}
