import type { ReactNode } from "react";
import Link from "next/link";

import { LivingSky } from "@/components/motion/living-sky";
import { getSkyPeriod } from "@/lib/sky";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-canvas">
      <LivingSky period={getSkyPeriod()} className="z-0 opacity-60" />
      <div className="relative z-10">
        <header className="mx-auto flex h-16 w-full max-w-2xl items-center px-5 sm:px-6">
          <Link
            href="/today"
            className="font-serif text-lg tracking-tight text-ink"
          >
            YOD <span className="text-gold">Circle</span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6 sm:px-6 sm:pt-12">
          {children}
        </main>
      </div>
    </div>
  );
}
