"use client";

import { signOutEverywhere } from "@/lib/actions/sign-out";

export function SignOutEverywhere() {
  return (
    <form action={signOutEverywhere}>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-soft border border-line px-3 text-xs font-medium text-ink transition hover:bg-surface-soft"
      >
        Sign out of all devices
      </button>
    </form>
  );
}
