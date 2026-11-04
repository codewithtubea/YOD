"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { signOut } from "@/lib/actions/sign-out";
import { Avatar } from "@/components/ui/avatar";

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-10 items-center rounded-lg px-3 text-sm text-ink transition hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {children}
    </Link>
  );
}

export function AccountMenu({
  displayName,
  avatarUrl,
  isAdmin,
}: {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    details.current?.removeAttribute("open");
  }, [pathname]);

  return (
    <details ref={details} className="group relative">
      <summary
        className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full p-1 pr-2 text-ink-soft transition hover:bg-surface-soft hover:text-ink [&::-webkit-details-marker]:hidden"
        aria-label={`Account menu for ${displayName}`}
      >
        <Avatar name={displayName} src={avatarUrl} size="sm" />
        <span className="hidden max-w-28 truncate text-sm lg:inline">
          {displayName}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-3.5 text-ink-soft transition group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-soft border border-line bg-surface p-2 shadow-2xl shadow-forest/15">
        <div className="border-b border-line px-3 pb-3 pt-2">
          <p className="truncate text-sm font-medium text-ink">{displayName}</p>
          <p className="mt-0.5 text-xs text-ink-soft">In the circle</p>
        </div>

        <nav aria-label="Account" className="mt-1 grid gap-0.5">
          <MenuLink href="/profile">Your profile</MenuLink>
          <MenuLink href="/people">The circle</MenuLink>
          <MenuLink href="/settings">Settings</MenuLink>
          <MenuLink href="/privacy">Privacy</MenuLink>
          <MenuLink href="/help">Help</MenuLink>
          {isAdmin ? <MenuLink href="/admin">Admin</MenuLink> : null}
        </nav>

        <form action={signOut} className="mt-1 border-t border-line pt-1">
          <button
            type="submit"
            className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
