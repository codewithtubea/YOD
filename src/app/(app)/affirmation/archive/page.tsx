import type { Metadata } from "next";
import Link from "next/link";

import { Star } from "@/components/art/star";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  affirmationPreview,
  formatAffirmationDate,
  groupAffirmationsByMonth,
} from "@/lib/affirmations/format";
import { getArchiveAffirmations } from "@/lib/affirmations/data";

export const metadata: Metadata = {
  title: "Affirmation archive",
};

export default async function AffirmationArchivePage() {
  const { available, items } = await getArchiveAffirmations();
  const months = groupAffirmationsByMonth(items);

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
          href="/affirmation/saved"
          className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          Saved
        </Link>
      </nav>

      <header className="space-y-3">
        <p className="type-caption font-semibold text-gold">Archive</p>
        <h1 className="type-title text-ink">Words that stayed.</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
          Every line shared with the circle, kept quietly by month. Open one to
          receive it again, Amen, or save it for later.
        </p>
      </header>

      {!available ? (
        <EmptyState
          icon={<Star size={28} animated />}
          eyebrow="One small setup step"
          title="The archive is waiting"
          description="Apply the Phase 5 migration in Supabase to open past affirmations."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Star size={28} animated />}
          title="No words in the archive yet"
          description="Once an affirmation has been shared, it will rest here by month."
          action={
            <ButtonLink href="/affirmation" variant="quiet" size="sm">
              Today&apos;s word
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-10">
          {months.map((month) => (
            <section key={month.key} aria-labelledby={`month-${month.key}`}>
              <div className="flex items-center gap-3">
                <h2
                  id={`month-${month.key}`}
                  className="type-heading text-ink"
                >
                  {month.label}
                </h2>
                <span className="text-xs text-ink-soft">
                  {month.items.length}{" "}
                  {month.items.length === 1 ? "word" : "words"}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {month.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/affirmation?date=${item.publishDate}`}
                      className="group flex min-h-16 items-start gap-4 rounded-2xl border border-line bg-surface/65 px-4 py-3.5 transition hover:border-gold/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="w-20 shrink-0 text-xs font-medium tabular-nums text-ink-soft">
                        {formatAffirmationDate(item.publishDate)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-lg leading-snug text-ink">
                          {affirmationPreview(item.body)}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                          {item.amenCount > 0 ? (
                            <span>
                              Amen · {item.amenCount}
                            </span>
                          ) : null}
                          {item.viewerSaved ? (
                            <Badge tone="gold">Saved</Badge>
                          ) : null}
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
