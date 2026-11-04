"use client";

import { LightRays } from "@/components/art/light-rays";
import { cn } from "@/lib/cn";
import type { SkyPeriod } from "@/lib/sky";
import { Motes } from "./motes";
import { useAmbientActivity } from "./use-ambient-activity";

const PERIODS: SkyPeriod[] = ["dawn", "morning", "afternoon", "dusk", "night"];

type LivingSkyProps = {
  period?: SkyPeriod;
  rays?: boolean;
  motes?: boolean;
  contained?: boolean;
  className?: string;
};

export function LivingSky({
  period = "morning",
  rays = true,
  motes = true,
  contained = false,
  className,
}: LivingSkyProps) {
  const { ref, active } = useAmbientActivity<HTMLDivElement>();
  const current = period;

  return (
    <div
      ref={ref}
      aria-hidden
      data-ambient-active={active ? "true" : "false"}
      className={cn(
        "pointer-events-none overflow-hidden",
        contained ? "absolute inset-0" : "fixed inset-0",
        className,
      )}
    >
      {PERIODS.map((item) => (
        <div
          key={item}
          data-active={item === current ? "true" : "false"}
          className={cn("sky-layer", `sky--${item}`)}
        />
      ))}

      {rays ? (
        <LightRays
          animated={active}
          className="absolute -left-[12%] -top-[24%] h-[150%] w-[85%] text-gold opacity-70"
        />
      ) : null}

      {motes ? <Motes /> : null}
    </div>
  );
}
