"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const TABS = [
  { href: "/today/questions", label: "Questions" },
  { href: "/today/archive", label: "Archive" },
] as const;

export function StudyTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Daily study"
      className="grid grid-cols-2 border-b border-line"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium transition-colors duration-quick",
              active
                ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gold"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
