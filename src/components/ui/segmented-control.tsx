"use client";

import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export type SegmentOption = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
        event.key,
      )
    ) {
      return;
    }

    event.preventDefault();
    let nextIndex = activeIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (activeIndex + 1) % options.length;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (activeIndex - 1 + options.length) % options.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = options.length - 1;

    const next = options[nextIndex];
    if (!next) return;

    onChange(next.id);
    buttons.current.get(next.id)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={moveFocus}
      className={cn(
        "relative grid overflow-hidden rounded-full border border-line bg-surface-soft",
        className,
      )}
      style={
        {
          "--segment-count": options.length,
          "--segment-index": activeIndex,
        } as CSSProperties
      }
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            ref={(node) => {
              if (node) buttons.current.set(option.id, node);
              else buttons.current.delete(option.id);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative z-10 inline-flex min-h-10 items-center justify-center gap-2 px-3 text-sm font-medium transition-colors duration-quick",
              selected ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {option.icon ? (
              <span aria-hidden className="shrink-0">
                {option.icon}
              </span>
            ) : null}
            {option.label}
          </button>
        );
      })}
      <span
        aria-hidden
        className="segmented-thumb pointer-events-none absolute inset-y-0 left-0 rounded-full bg-surface shadow-sm"
      />
    </div>
  );
}
