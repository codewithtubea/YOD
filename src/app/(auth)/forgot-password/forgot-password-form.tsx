"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      setMessage(result.message);
      setIsError(!result.ok);
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isPending} noValidate>
        <div className="space-y-2">
          <label htmlFor="reset-email" className="block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-focus focus:ring-2 focus:ring-focus/15"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-on-forest transition hover:bg-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <Link
        href="/sign-in"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-ink-soft transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Back to sign in
      </Link>

      {message ? (
        <p
          role={isError ? "alert" : "status"}
          className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            isError
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-sage/60 bg-sage-soft text-ink"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
