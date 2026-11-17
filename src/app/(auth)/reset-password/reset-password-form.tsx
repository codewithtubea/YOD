"use client";

import { useState, useTransition, type FormEvent } from "react";

import { completePasswordReset } from "./actions";

type FieldErrors = Record<string, string[]>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await completePasswordReset({
        token,
        password,
        confirmPassword,
      });

      if (!result.ok) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isPending} noValidate>
        <div className="space-y-2">
          <label htmlFor="new-password" className="block text-sm font-medium text-ink">
            New password
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-focus focus:ring-2 focus:ring-focus/15"
          />
          {fieldErrors.password?.[0] ? (
            <p className="text-xs text-danger">{fieldErrors.password[0]}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="block text-sm font-medium text-ink">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-focus focus:ring-2 focus:ring-focus/15"
          />
          {fieldErrors.confirmPassword?.[0] ? (
            <p className="text-xs text-danger">{fieldErrors.confirmPassword[0]}</p>
          ) : null}
        </div>

        <p className="text-xs leading-relaxed text-ink-soft">
          Use at least 8 characters. Never reuse a password from another service.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-on-forest transition hover:bg-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save new password"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-relaxed text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
