import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  affirmationPreview,
  formatAffirmationDate,
} from "@/lib/affirmations/format";
import { getSavedAffirmations } from "@/lib/affirmations/data";

export const metadata: Metadata = {
  title: "Saved affirmations",
};

export default async function SavedAffirmationsPage() {
  const { available, items } = await getSavedAffirmations();

  return (
    <div className="space-y-8">
      <nav
        aria-label="Affirmation pages"
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        <Link
          href="/affirmation"
          className="mr-auto inline-flex min-h-10 items-center text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          ← Today&apos;s word
        </Link>
        <Link
          href="/affirmation/archive"
          className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          Archive
        </Link>
      </nav>

      <header className="space-y-3">
        <p className="type-caption font-semibold text-gold">Saved</p>
        <h1 className="type-title text-ink">Words you kept.</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
          A private shelf for the lines you want to return to. Only you can see
          what you save.
        </p>
      </header>

      {!available ? (
        <EmptyState
          icon={<Bookmark size={26} />}
          eyebrow="One small setup step"
          title="Saved words are waiting"
          description="Apply the Phase 5 migration in Supabase to keep affirmations here."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={26} />}
          title="Nothing saved yet"
          description="When a line speaks to you, tap Save on the affirmation. It will rest here, privately."
          action={
            <ButtonLink href="/affirmation" variant="quiet" size="sm">
              Today&apos;s word
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/affirmation?date=${item.publishDate}`}
                className="group flex min-h-16 items-start gap-4 rounded-2xl border border-line bg-surface/65 px-4 py-3.5 transition hover:border-gold/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Bookmark
                  aria-hidden
                  size={17}
                  className="mt-1 shrink-0 text-gold"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-lg leading-snug text-ink">
                    {affirmationPreview(item.body, 120)}
                  </span>
                  <span className="mt-1 block text-xs text-ink-soft">
                    {formatAffirmationDate(item.publishDate, true)}
                    {item.amenCount > 0 ? ` · Amen ${item.amenCount}` : ""}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="mt-0.5 text-sm text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-gold"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
