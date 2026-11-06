"use client";

import { useId } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export function ProfileFields({
  name,
  bio,
  birthday,
  onNameChange,
  onBioChange,
  onBirthdayChange,
  errors,
  disabled,
}: {
  name: string;
  bio: string;
  birthday: string;
  onNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onBirthdayChange: (value: string) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
}) {
  const nameId = useId();
  const birthdayId = useId();
  const nameError = errors?.displayName?.[0];
  const birthdayError = errors?.birthday?.[0];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor={nameId} className="text-sm font-medium text-ink">
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          maxLength={50}
          disabled={disabled}
          autoComplete="name"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${nameId}-error` : undefined}
          onChange={(event) => onNameChange(event.target.value)}
          className={cn(
            "min-h-11 w-full rounded-soft border bg-surface px-4 text-sm text-ink transition duration-quick ease-settle",
            "hover:border-sage/70 focus:border-forest focus:outline-none focus:ring-2 focus:ring-focus/20",
            nameError ? "border-danger" : "border-line",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
        <p className="text-xs text-ink-soft">
          This name appears beside your reflections and in the circle directory.
        </p>
        {nameError ? (
          <p id={`${nameId}-error`} className="text-xs font-medium text-danger">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor={birthdayId} className="text-sm font-medium text-ink">
          Birthday
        </label>
        <input
          id={birthdayId}
          type="date"
          value={birthday}
          disabled={disabled}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) => onBirthdayChange(event.target.value)}
          className={cn(
            "min-h-11 w-full rounded-soft border bg-surface px-4 text-sm text-ink transition duration-quick ease-settle",
            "hover:border-sage/70 focus:border-forest focus:outline-none focus:ring-2 focus:ring-focus/20",
            birthdayError ? "border-danger" : "border-line",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
        <p className="text-xs text-ink-soft">
          Keep this private to the circle. We use it only for birthday notices.
        </p>
        {birthdayError ? (
          <p id={`${birthdayId}-error`} className="text-xs font-medium text-danger">
            {birthdayError}
          </p>
        ) : null}
      </div>

      <Textarea
        label="Short bio"
        hint="Optional. A sentence or two about you."
        value={bio}
        maxLength={160}
        rows={4}
        disabled={disabled}
        error={errors?.bio?.[0]}
        onChange={(event) => onBioChange(event.target.value)}
      />
    </div>
  );
}
