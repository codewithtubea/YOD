"use client";

import { useState, useTransition, type FormEvent } from "react";

import { join } from "./actions";

export function JoinForm({
  initialEmail,
  next,
}: {
  initialEmail: string;
  next: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    startTransition(async () => {
      const result = await join({ email, password, displayName, birthday, next });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
    });
  }

  if (notice) {
    return (
      <div className="rounded-3xl border border-sage/60 bg-surface/85 p-6 shadow-lg shadow-forest/5 sm:p-8">
        <p className="type-label text-gold">Request received</p>
        <p className="mt-3 text-sm leading-relaxed text-ink">{notice}</p>
        <a
          href="/sign-in"
          className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-link underline-offset-4 hover:underline"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
      <form onSubmit={submit} className="space-y-5" aria-busy={isPending} noValidate>
        <div className="space-y-2">
          <label htmlFor="join-email" className="block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="join-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-focus focus:ring-2 focus:ring-focus/15"
          />
          <p className="text-xs text-ink-soft">
            Use an address you can check. We never show it to the circle.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="join-name" className="block text-sm font-medium text-ink">
            Your name
          </label>
          <input
            id="join-name"
            autoComplete="name"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How the circle will know you"
            className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-focus focus:ring-2 focus:ring-focus/15"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="join-birthday" className="block text-sm font-medium text-ink">
            Your birthday
          </label>
          <input
            id="join-birthday"
            type="date"
            required
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
            className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/15"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="join-password" className="block text-sm font-medium text-ink">
              Choose a password
            </label>
            <input
              id="join-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/15"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="join-confirm" className="block text-sm font-medium text-ink">
              Confirm password
            </label>
            <input
              id="join-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/15"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          aria-pressed={showPassword}
          className="text-xs font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          {showPassword ? "Hide passwords" : "Show passwords"}
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-on-forest transition hover:bg-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Sending request…" : "Request to join"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-relaxed text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
