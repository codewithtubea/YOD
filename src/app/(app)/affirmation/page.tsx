import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Star } from "@/components/art/star";
import { AffirmationCard } from "@/components/affirmations/affirmation-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAffirmationDate } from "@/lib/affirmations/format";
import { getAffirmationByDate } from "@/lib/affirmations/data";
import { getCircleToday } from "@/lib/circle";
import { parseIsoDate } from "@/lib/date";

export const metadata: Metadata = {
  title: "Affirmation",
};

export default async function AffirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = await getCircleToday();
  const requested = params.date ? parseIsoDate(params.date) : null;

  if (params.date && !requested) notFound();
  if (requested && requested > today) notFound();

  const date = requested ?? today;
  const viewingToday = date === today;
  const { available, affirmation } = await getAffirmationByDate(date);

  return (
    <div className="space-y-7">
      <nav
        aria-label="Affirmation pages"
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        <Link
          href="/today"
          className="mr-auto inline-flex min-h-10 items-center text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          ← Today
        </Link>
        <Link
          href="/affirmation/archive"
          className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          Archive
        </Link>
        <Link
          href="/affirmation/saved"
          className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          Saved
        </Link>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="type-caption font-semibold text-gold">
            {viewingToday ? "Affirmation" : "From the archive"}
          </p>
          <span className="text-xs text-ink-soft">
            {formatAffirmationDate(date, true)}
          </span>
          {!viewingToday ? <Badge tone="sage">Past word</Badge> : null}
        </div>
        <h1 className="type-title text-ink">
          {viewingToday ? "A word to carry." : "A word that stayed."}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
          One short line for the day, revealed when you are ready. Nothing here
          is measured, and you can keep what speaks to you.
        </p>
      </header>

      {!available ? (
        <EmptyState
          icon={<Star size={28} animated />}
          eyebrow="One small setup step"
          title="Affirmations are not set up yet"
          description="Apply the Phase 5 migration in Supabase to open the daily word, its veil, Amen, and saved lines."
          action={
            <ButtonLink href="/today" variant="quiet" size="sm">
              Return to Today
            </ButtonLink>
          }
        />
      ) : affirmation ? (
        <>
          <AffirmationCard
            affirmation={affirmation}
            label={
              viewingToday
                ? undefined
                : "Tap to receive this affirmation"
            }
          />
          {!viewingToday ? (
            <div className="flex justify-center">
              <ButtonLink href="/affirmation" variant="quiet" size="sm">
                See today&apos;s word
              </ButtonLink>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<Star size={28} animated />}
          eyebrow={viewingToday ? "Today" : "This day"}
          title={
            viewingToday
              ? "The word is not set yet"
              : "No affirmation was set for this day"
          }
          description={
            viewingToday
              ? "An admin can set today's line. Come back in a little while."
              : "The archive holds the words that were shared. You can return to today or browse what came before."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/affirmation/archive" variant="quiet" size="sm">
                Browse the archive
              </ButtonLink>
              {!viewingToday ? (
                <ButtonLink href="/affirmation" size="sm">
                  Today&apos;s word
                </ButtonLink>
              ) : null}
            </div>
          }
        />
      )}
    </div>
  );
}
