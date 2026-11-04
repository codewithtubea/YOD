"use client";

import { useState } from "react";
import { m } from "motion/react";

import { WingPair } from "@/components/art/wing-pair";
import { cn } from "@/lib/cn";
import { useSoftChime } from "./sound-preference";

type AmenButtonProps = {
  onAmen?: () => void;
  onToggle?: (next: boolean) => void;
  active?: boolean;
  count?: number;
  disabled?: boolean;
  className?: string;
};

export function AmenButton({
  onAmen,
  onToggle,
  active,
  count,
  disabled,
  className,
}: AmenButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [said, setSaid] = useState(false);
  const [pulse, setPulse] = useState(0);
  const { play } = useSoftChime();

  const isActive = active ?? said;
  const wingsOpen = hovered || focused || isActive;

  function handleClick() {
    const next = !isActive;
    if (active === undefined) setSaid(next);
    setPulse((current) => current + 1);
    play();
    onAmen?.();
    onToggle?.(next);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isActive}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(
        "relative inline-flex min-h-11 items-center gap-2.5 rounded-full border border-gold/40 bg-gold-soft/55 px-5 text-sm font-medium text-ink transition duration-quick ease-settle active:scale-[0.98] motion-reduce:active:scale-100",
        "hover:border-gold/70 hover:bg-gold-soft disabled:pointer-events-none disabled:opacity-55",
        className,
      )}
    >
      <span className="relative inline-flex size-6 items-center justify-center">
        <WingPair size={24} open={wingsOpen} className="text-gold" />
        {pulse > 0 ? (
          <m.span
            key={pulse}
            aria-hidden
            initial={{ opacity: 0.55, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.7 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 rounded-full border border-gold"
          />
        ) : null}
      </span>
      <span>Amen{typeof count === "number" && count > 0 ? ` · ${count}` : ""}</span>
    </button>
  );
}
