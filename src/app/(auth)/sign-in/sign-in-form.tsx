"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import { requestCode, verifyCode } from "./actions";

type Props = {
  next: string;
  initialError: string | null;
  initialNotice: string | null;
};

export function SignInForm({ next, initialError, initialNotice }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  const codeInputRef = useRef<HTMLInputElement>(null);
  const codeFormRef = useRef<HTMLFormElement>(null);
  const lastSubmittedCode = useRef("");

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "code" || code.length !== 6 || isPending) return;
    if (lastSubmittedCode.current === code) return;

    lastSubmittedCode.current = code;
    codeFormRef.current?.requestSubmit();
  }, [code, step, isPending]);

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    startTransition(async () => {
      const result = await requestCode({ email, next });

      if (!result.ok) {
        setError(result.message);
        if (result.retryAfter) setCooldown(result.retryAfter);
        return;
      }

      setStep("code");
      setNotice(result.message);
      setCooldown(60);
    });
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setError(null);
    setNotice(null);

    startTransition(async () => {
      const result = await verifyCode({ email, token: code, next });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  function handleResend() {
    if (cooldown > 0 || isPending) return;

    setError(null);
    setNotice(null);

    startTransition(async () => {
      const result = await requestCode({ email, next });

      if (!result.ok) {
        setError(result.message);
        if (result.retryAfter) setCooldown(result.retryAfter);
        return;
      }

      setNotice(result.message);
      setCooldown(60);
      codeInputRef.current?.focus();
    });
  }

  function handleChangeEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setNotice(null);
    setCooldown(0);
    lastSubmittedCode.current = "";
  }

  return (
    <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
      {step === "email" ? (
        <form
          onSubmit={handleEmailSubmit}
          className="space-y-5"
          aria-busy={isPending}
          noValidate
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink"
            >
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
              aria-describedby="email-help"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="block min-h-12 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-focus focus:ring-2 focus:ring-focus/15"
            />
            <p
              id="email-help"
              className="text-xs leading-relaxed text-ink-soft"
            >
              We&apos;ll send a sign-in link and a 6-digit code. No password
              needed.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending || email.trim().length === 0}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-on-forest transition hover:bg-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send sign-in code"}
          </button>
        </form>
      ) : (
        <form
          ref={codeFormRef}
          onSubmit={handleCodeSubmit}
          className="space-y-5"
          aria-busy={isPending}
          noValidate
        >
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">
              We sent a message to{" "}
              <span className="font-medium text-ink">{email}</span>.
            </p>
            <label
              htmlFor="code"
              className="block pt-1 text-sm font-medium text-ink"
            >
              Enter the 6-digit code from your email
            </label>
            <input
              ref={codeInputRef}
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              aria-describedby="code-help"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="block min-h-14 w-full rounded-xl border border-line bg-surface-soft/70 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none transition placeholder:text-ink-soft/30 focus:border-focus focus:ring-2 focus:ring-focus/15"
            />
            <p id="code-help" className="text-xs leading-relaxed text-ink-soft">
              The link in the email also works. If it opens in a different
              browser, use this code instead.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending || code.length !== 6}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-on-forest transition hover:bg-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Checking…" : "Sign in"}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isPending}
              className="min-h-11 font-medium text-link underline decoration-link/30 underline-offset-4 transition hover:opacity-80 disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={isPending}
              className="min-h-11 font-medium text-ink-soft underline decoration-ink-soft/30 underline-offset-4 transition hover:text-ink disabled:opacity-60"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

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
