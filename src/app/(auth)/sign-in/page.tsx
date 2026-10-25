import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SignInForm } from "./sign-in-form";
import { getAuthContext } from "@/lib/auth";
import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { signOut } from "@/lib/actions/sign-out";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  link_browser:
    "That link opened in a different browser, so it couldn't sign you in. Enter the 6-digit code from the email instead, or request a new one.",
  link_expired:
    "That sign-in link has expired. Request a new one below.",
  link_invalid:
    "That sign-in link is no longer valid. Request a new one below.",
  inactive: "Your access is paused. Contact the circle admin.",
  profile:
    "We couldn't finish setting up your account. Sign out and try again, or contact the circle admin.",
  config: "Sign-in isn't fully set up yet. Ask the circle admin.",
  auth: "We couldn't complete sign-in. Request a new code and try again.",
};

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function AuthScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <div aria-hidden className="ambient-auth pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            YOD Circle
          </p>
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft/70">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        </div>

        {children}

        <p className="mx-auto mt-8 max-w-xs text-center text-xs leading-relaxed text-ink-soft/80">
          Private and invite-only. If you need an invitation, ask someone in
          the circle.
        </p>
      </div>
    </main>
  );
}

function SignOutCard() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Sign out
      </button>
    </form>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = safeNextPath(firstValue(params.next));
  const errorKey = firstValue(params.error);
  const initialError = errorKey
    ? (ERROR_MESSAGES[errorKey] ??
      "We couldn't complete sign-in. Request a new code and try again.")
    : null;
  const initialNotice = firstValue(params.signedOut)
    ? "You're signed out. Sign in again when you're ready."
    : null;

  const env = readSupabaseEnv();
  const context = env.ok ? await getAuthContext() : null;

  if (context?.membership?.status === "active") {
    redirect(next);
  }

  if (!env.ok) {
    return (
      <AuthScreen
        eyebrow="Setup needed"
        title="Sign-in isn't ready yet"
        description="The circle's sign-in service is not configured. Ask the circle admin to finish setup."
      >
        <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
          <p className="font-medium text-ink">Missing environment variables</p>
          <ul className="mt-3 space-y-1 font-mono text-xs text-ink-soft">
            {env.missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Add them to <code>.env.local</code>, then restart the app.
          </p>
        </div>
      </AuthScreen>
    );
  }

  if (context) {
    const isPaused = context.membership?.status === "suspended";
    const isConfigError = context.error === "config";

    return (
      <AuthScreen
        eyebrow={isPaused ? "Access paused" : "Account setup"}
        title={
          isPaused
            ? "Your access is paused"
            : isConfigError
              ? "Sign-in isn't fully set up"
              : "We couldn't finish setting things up"
        }
        description={
          isPaused
            ? "You're signed in, but this account cannot enter the circle right now. Contact the circle admin if you think this is a mistake."
            : isConfigError
              ? "Your session is valid, but the membership database isn't ready yet. Ask the circle admin to finish setup."
              : "Your session is valid, but we couldn't find your membership. Sign out and try again, or contact the circle admin."
        }
      >
        <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
          <SignOutCard />
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      eyebrow="Sign in"
      title="Welcome back"
      description="Sign in with the email you were invited with. We'll send a link and a 6-digit code."
    >
      <SignInForm
        next={next}
        initialError={initialError}
        initialNotice={initialNotice}
      />
    </AuthScreen>
  );
}
