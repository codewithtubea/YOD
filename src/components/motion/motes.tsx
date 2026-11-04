import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

const MOTES = Array.from({ length: 14 }, (_, index) => {
  const x = (index * 37 + 11) % 100;
  const size = 2 + (index % 3);
  const delay = (index * 1.7) % 12;
  const duration = 16 + ((index * 5) % 11);
  const drift = ((index % 5) - 2) * 9;
  return { x, size, delay, duration, drift };
});

type MotesProps = {
  count?: number;
  className?: string;
};

export function Motes({ count = MOTES.length, className }: MotesProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {MOTES.slice(0, count).map((mote, index) => (
        <span
          key={index}
          className="mote"
          style={
            {
              left: `${mote.x}%`,
              width: mote.size,
              height: mote.size,
              "--mote-delay": `${mote.delay}s`,
              "--mote-duration": `${mote.duration}s`,
              "--mote-drift": `${mote.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
