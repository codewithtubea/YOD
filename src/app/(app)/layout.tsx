import type { ReactNode } from "react";
import Link from "next/link";

import { requireActiveMember } from "@/lib/auth";
import { signOut } from "@/lib/actions/sign-out";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { membership } = await requireActiveMember();

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:outline-2 focus:outline-focus"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between gap-4 px-5 sm:px-6">
          <Link
            href="/today"
            className="font-serif text-lg tracking-tight text-ink"
          >
            YOD <span className="text-gold">Circle</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm text-ink-soft sm:inline">
              {membership.display_name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-soft transition hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8 sm:px-6 sm:pt-12"
      >
        {children}
      </main>
    </div>
  );
}
