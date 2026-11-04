"use client";

import {
  useId,
  useState,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  maxLength?: number;
};

export function Textarea({
  label,
  hint,
  error,
  maxLength,
  value,
  defaultValue,
  onChange,
  id,
  className,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const countId = maxLength ? `${textareaId}-count` : undefined;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    defaultValue === undefined ? "" : String(defaultValue),
  );
  const text = isControlled ? String(value) : internalValue;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (!isControlled) setInternalValue(event.target.value);
    onChange?.(event);
  }

  const describedBy = [hintId, errorId, countId].filter(Boolean).join(" ");

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-ink"
        >
          {label}
        </label>
        {maxLength ? (
          <span
            id={countId}
            className={cn(
              "text-xs tabular-nums text-ink-soft",
              text.length > maxLength * 0.9 && "text-clay",
            )}
          >
            {text.length} / {maxLength}
          </span>
        ) : null}
      </div>

      <textarea
        id={textareaId}
        value={text}
        onChange={handleChange}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "min-h-36 w-full resize-y rounded-soft border bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-soft/65",
          "transition duration-quick ease-settle hover:border-sage/70 focus:border-forest focus:outline-none focus:ring-2 focus:ring-focus/20",
          error ? "border-danger" : "border-line",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium leading-relaxed text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
