import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

export type OverflowItem = {
  href: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};

type OverflowMenuProps = {
  label?: string;
  items: OverflowItem[];
  className?: string;
  align?: "left" | "right";
};

export function OverflowMenu({
  label = "More",
  items,
  className,
  align = "right",
}: OverflowMenuProps) {
  if (items.length === 0) return null;

  return (
    <details className={cn("group relative", className)}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-soft px-3 text-sm font-medium text-ink-soft transition hover:bg-surface-soft hover:text-ink [&::-webkit-details-marker]:hidden">
        {label}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-4 transition-transform duration-quick ease-settle group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div
        className={cn(
          "absolute top-full z-50 mt-2 w-64 rounded-soft border border-line bg-surface p-1.5 shadow-2xl shadow-forest/15",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-3 rounded-[calc(var(--radius-soft)-0.25rem)] px-3 py-2.5 transition hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {item.icon ? (
              <span aria-hidden className="mt-0.5 shrink-0 text-gold">
                {item.icon}
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                {item.label}
              </span>
              {item.description ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                  {item.description}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </details>
  );
}
