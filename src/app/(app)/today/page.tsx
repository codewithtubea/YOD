import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  BookOpenText,
  Heart,
  HeartPulse,
  MessageCircleQuestion,
} from "lucide-react";

import { getCircleSettings, getCircleToday } from "@/lib/circle";
import { requireActiveMember } from "@/lib/auth";
import { addDaysToIsoDate, formatPlanDate, parseIsoDate } from "@/lib/date";
import { BIBLE_SOURCES, buildBibleUrl } from "@/lib/bible";
import { getGuardianLineForDate } from "@/lib/guardian-lines";
import { getTodayData } from "@/lib/study/data";
import { getCurrentAnnouncement, getSermonLinks } from "@/lib/admin/data";
import { getAffirmationByDate } from "@/lib/affirmations/data";
import { getCheckInData } from "@/lib/check-in/data";
import { formatWeekRange, moodLabel } from "@/lib/check-in/moods";
import type { CheckInData } from "@/lib/check-in/types";
import { AffirmationCard } from "@/components/affirmations/affirmation-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OpenBook } from "@/components/art/open-book";
import { Discussion } from "@/components/study/discussion";
import { GuardianOnce } from "@/components/study/guardian-once";
import { MemberTour } from "@/components/study/member-tour";
import { ReadingActions } from "@/components/study/reading-actions";
import { AnnouncementBanner } from "@/components/study/announcement-banner";
import { SermonShelf } from "@/components/study/sermon-shelf";
import { getMyAccount, getTodayBirthdays } from "@/lib/account/data";

export const metadata: Metadata = {
  title: "Today",
};

function Chip({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 text-xs font-medium text-ink-soft transition hover:border-sage hover:text-ink"
    >
      {icon}
      {children}
    </Link>
  );
}

function CheckInStatus({ data }: { data: CheckInData }) {
  if (!data.available) return null;

  const done = Boolean(data.checkIn?.checkedIn);
  const weekStart = data.checkIn?.weekStart ?? data.presence?.weekStart ?? null;
  const nextWeek = weekStart ? addDaysToIsoDate(weekStart, 7) : null;

  return (
    <section aria-labelledby="check-in-status-title">
      <Card variant={done ? "soft" : "gold"} padding="sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-caption font-semibold text-gold">Weekly check-in</p>
            <h2 id="check-in-status-title" className="mt-1 type-heading text-ink">
              {done
                ? "You checked in this week."
                : "A gentle check-in is waiting."}
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
              {done
                ? `${moodLabel(data.checkIn?.mood)}${
                    weekStart ? ` · ${formatWeekRange(weekStart)}` : ""
                  }.${
                    nextWeek
                      ? ` Next check-in opens ${formatWeekRange(nextWeek)}.`
                      : ""
                  }`
                : "One honest word, with a private note if you want. No streaks, no rankings, no pressure."}
            </p>
          </div>
          <ButtonLink
            href="/check-in"
            variant={done ? "quiet" : "primary"}
            size="sm"
          >
            {done ? "Open check-in" : "Check in now"}
          </ButtonLink>
        </div>
      </Card>
    </section>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tour?: string }>;
}) {
  const { userId, membership } = await requireActiveMember();
  const [today, settings, params] = await Promise.all([
    getCircleToday(),
    getCircleSettings(),
    searchParams,
  ]);

  const requested = params.date ? parseIsoDate(params.date) : today;
  if (params.date && !requested) notFound();
  if (requested && requested > today) notFound();

  const date = requested ?? today;
  const catchingUp = date < today;
  const [data, announcement, sermons, affirmation, checkIn, birthdays, account] = await Promise.all([
    getTodayData({ planDate: date }),
    !catchingUp ? getCurrentAnnouncement() : Promise.resolve(null),
    !catchingUp
      ? getSermonLinks({ publishedOnly: true })
      : Promise.resolve({ available: false, links: [] }),
    getAffirmationByDate(date),
    getCheckInData(),
    getTodayBirthdays(),
    getMyAccount(),
  ]);

  const currentAccount = account.account;
  const birthdayNotice =
    birthdays.available && birthdays.names.length > 0
      ? birthdays.names.length === 1
        ? `${birthdays.names[0]} has a birthday today.`
        : `${birthdays.names.join(", ")} have birthdays today.`
      : null;

  const birthdayMessage =
    birthdayNotice && currentAccount
      ? birthdays.names.some((name) => name === currentAccount.displayName)
        ? `Happy birthday, ${currentAccount.displayName}! ${birthdayNotice}`
        : birthdayNotice
      : birthdayNotice;

  const viewer = {
    userId,
    displayName: membership.display_name,
    role: membership.role,
  };
  const sourceLabel =
    BIBLE_SOURCES.find(
      (source) => source.id === data.settings.defaultBibleSource,
    )?.label ?? "BibleGateway";

  return (
    <div className="space-y-7">
      <MemberTour userId={userId} forceOpen={params.tour === "1"} />

      {birthdayMessage ? (
        <section aria-live="polite">
          <Card variant="gold" padding="sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-2xl" aria-hidden>🎉</span>
              <div>
                <p className="type-caption font-semibold text-gold">Birthday</p>
                <h2 className="mt-1 type-heading text-ink">{birthdayMessage}</h2>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {announcement ? <AnnouncementBanner announcement={announcement} /> : null}

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {catchingUp ? "Catching up" : "Today"}
          </p>
          <span className="text-xs text-ink-soft">{formatPlanDate(date)}</span>
          {catchingUp ? <Badge tone="sage">Past reading</Badge> : null}
        </div>

        {data.plan ? (
          <div className="space-y-3">
            <h1 className="type-title text-ink">
              {data.plan.referenceText}
            </h1>
            <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
              Read the chapter in your Bible, then come back to share what
              stayed with you. Nothing is measured here.
            </p>
            <ButtonLink
              href={buildBibleUrl(
                data.settings.defaultBibleSource,
                data.plan.book,
                data.plan.chapterStart,
                data.plan.chapterEnd,
              )}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              className="w-full sm:w-auto"
            >
              Read on {sourceLabel}
              <span aria-hidden>↗</span>
            </ButtonLink>
          </div>
        ) : (
          <h1 className="type-title text-ink">
            {data.available
              ? catchingUp
                ? "No reading was set for this day."
                : "No reading set for today yet."
              : "The daily study isn't set up yet."}
          </h1>
        )}

        <nav aria-label="More in Today" className="flex flex-wrap gap-2">
          <Chip
            href="/today/questions"
            icon={<MessageCircleQuestion aria-hidden size={14} />}
          >
            Questions
          </Chip>
          <Chip
            href="/today/archive"
            icon={<Archive aria-hidden size={14} />}
          >
            Reading archive
          </Chip>
          {sermons.available && sermons.links.length > 0 ? (
            <Chip
              href="#sermons"
              icon={<BookOpenText aria-hidden size={14} />}
            >
              Sermons
            </Chip>
          ) : null}
          <Chip href="/check-in" icon={<HeartPulse aria-hidden size={14} />}>
            Check-in
          </Chip>
        </nav>
      </header>

      {!data.available ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          eyebrow="One small setup step"
          title="The study tables are waiting"
          description="Apply the Phase 3 migration in Supabase to open the reading plan, thoughts, questions, and notifications."
          action={
            membership.role === "admin" ? (
              <ButtonLink href="/admin/reading" variant="quiet">
                Open reading plan admin
              </ButtonLink>
            ) : undefined
          }
        />
      ) : !data.plan ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          eyebrow={catchingUp ? "This day" : "Today"}
          title={
            catchingUp
              ? "Nothing was set for this day"
              : "The page is still quiet"
          }
          description={
            membership.role === "admin"
              ? "Set today's reading in the admin page. Members will see it immediately."
              : "An admin can set today's reading. Come back in a little while."
          }
          action={
            membership.role === "admin" ? (
              <ButtonLink href="/admin/reading">Set today&apos;s reading</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <ReadingActions
            planDate={data.plan.date}
            initiallyRead={data.viewerHasRead}
            readCount={data.readSummary.readCount}
            activeCount={data.readSummary.activeCount}
            catchingUp={catchingUp}
          />

          {affirmation.available && affirmation.affirmation ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="type-caption font-semibold text-gold">
                  {catchingUp ? "A word for this day" : "A word to carry"}
                </p>
                <Link
                  href={
                    catchingUp
                      ? `/affirmation?date=${date}`
                      : "/affirmation"
                  }
                  className="inline-flex min-h-9 items-center text-xs font-medium text-link underline-offset-4 hover:underline"
                >
                  Open affirmation
                </Link>
              </div>
              <AffirmationCard
                affirmation={affirmation.affirmation}
                compact
                label={
                  catchingUp
                    ? "Tap to receive this affirmation"
                    : undefined
                }
              />
            </section>
          ) : null}

          {!catchingUp && settings.available ? (
            <GuardianOnce
              date={date}
              line={getGuardianLineForDate(new Date(), settings.timezone)}
            />
          ) : null}
        </>
      )}

      {!catchingUp && sermons.available ? (
        <SermonShelf links={sermons.links} />
      ) : null}

      {checkIn.unreadCount > 0 ? (
        <Link
          href="/people#encouragements"
          className="group block rounded-card border border-gold/30 bg-gold-soft/55 px-5 py-4 transition hover:border-gold/50"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
              <Heart aria-hidden size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-xl leading-tight text-ink">
                Kind words are waiting
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                {checkIn.unreadCount === 1
                  ? "One private encouragement is waiting in the circle."
                  : `${checkIn.unreadCount} private encouragements are waiting in the circle.`}
              </span>
            </span>
          </div>
        </Link>
      ) : null}

      <CheckInStatus data={checkIn} />

      {data.plan ? (
        <Discussion
          initial={data}
          viewer={viewer}
          catchingUp={catchingUp}
        />
      ) : null}
    </div>
  );
}
