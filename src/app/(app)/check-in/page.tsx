import type { Metadata } from "next";
import Link from "next/link";

import { Heart } from "lucide-react";

import { CheckInPanel } from "@/components/check-in/check-in-panel";
import { Dove } from "@/components/art/dove";
import { Card } from "@/components/ui/card";
import { getCheckInData } from "@/lib/check-in/data";
import { formatWeekRange, presencePercent } from "@/lib/check-in/moods";
import { requireActiveMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Check-in",
};

export default async function CheckInPage() {
  await requireActiveMember();
  const data = await getCheckInData();

  return (
    <div className="space-y-8">
      <header>
        <p className="type-caption font-semibold text-gold">Check-in</p>
        <h1 className="type-title mt-2 text-ink">A gentle pulse.</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
          One small, honest moment each week so the circle can care for one
          another. No streaks, no rankings, no pressure.
        </p>
      </header>

      {!data.available ? (
        <Card>
          <h2 className="type-heading text-ink">Check-in is not ready yet.</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Apply the Phase 6 migration, then reload this page. Nothing is
            collected until it is ready.
          </p>
        </Card>
      ) : (
        <>
          {data.presence ? (
            <Card variant="soft" padding="sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-caption font-semibold text-gold">
                    The circle this week
                  </p>
                  <p className="mt-2 font-serif text-2xl leading-none text-ink">
                    {data.presence.checkedInCount} of{" "}
                    {data.presence.circleSize}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    have checked in. Only the total is shown; names stay
                    private.
                  </p>
                </div>
                <p className="text-xs text-ink-soft">
                  {formatWeekRange(data.presence.weekStart)}
                </p>
              </div>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-line"
                role="img"
                aria-label={`${data.presence.checkedInCount} of ${data.presence.circleSize} members have checked in this week`}
              >
                <div
                  className="h-full rounded-full bg-gold transition-[width] duration-settle"
                  style={{
                    width: `${presencePercent(
                      data.presence.checkedInCount,
                      data.presence.circleSize,
                    )}%`,
                  }}
                />
              </div>
            </Card>
          ) : null}

          <CheckInPanel checkIn={data.checkIn} />

          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Dove size={18} className="mt-0.5 shrink-0 text-gold" />
            <span>
              Admins can read check-ins and notes so they can care for the
              circle. Other members never see your answer or note. Read more in{" "}
              <Link
                href="/privacy"
                className="text-link underline-offset-4 hover:underline"
              >
                Privacy
              </Link>
              .
            </span>
          </p>

          <Link
            href="/people#encouragements"
            className="group block rounded-card border border-gold/30 bg-gold-soft/55 px-5 py-4 transition hover:border-gold/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
                  <Heart aria-hidden size={18} />
                </span>
                <div>
                  <p className="type-caption font-semibold text-gold">
                    Encouragement
                  </p>
                  <h2 className="mt-1 font-serif text-xl leading-tight text-ink">
                    Kind words received
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {data.unreadCount > 0
                      ? `${data.unreadCount} ${
                          data.unreadCount === 1 ? "note is" : "notes are"
                        } waiting in your inbox.`
                      : "Open your inbox for private notes from the circle."}
                  </p>
                </div>
              </div>
              <span className="inline-flex min-h-9 items-center text-xs font-medium text-link">
                Open inbox →
              </span>
            </div>
          </Link>
        </>
      )}
    </div>
  );
}
