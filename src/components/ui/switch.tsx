"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

type SwitchProps = {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-ink">
          {label}
        </p>
        {description ? (
          <p
            id={descriptionId}
            className="mt-0.5 text-xs leading-relaxed text-ink-soft"
          >
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-quick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50",
          checked ? "border-forest bg-forest" : "border-line bg-surface-soft",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-4 rounded-full transition-transform duration-quick ease-settle",
            checked ? "translate-x-5 bg-on-forest" : "translate-x-1 bg-ink-soft",
          )}
        />
      </button>
    </div>
  );
}
