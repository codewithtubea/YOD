"use client";

import { useState, useTransition, type FormEvent } from "react";

import { signIn } from "./actions";

type Props = {
  next: string;
  initialError: string | null;
  initialNotice: string | null;
};

export function SignInForm({ next, initialError, initialNotice }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    startTransition(async () => {
      const result = await signIn({ email, password, next });

      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        aria-busy={isPending}
        noValidate
      >
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="email"
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

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 py-3 pl-4 pr-20 text-base text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-focus focus:ring-2 focus:ring-focus/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-1 my-auto flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wide text-ink-soft transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-on-forest transition hover:bg-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
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

      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-sage/60 bg-sage-soft px-4 py-3 text-sm leading-relaxed text-ink"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
