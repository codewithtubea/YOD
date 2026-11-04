import type { Metadata } from "next";
import Link from "next/link";

import { getCircleToday } from "@/lib/circle";
import { formatPlanDate } from "@/lib/date";
import { getArchiveData } from "@/lib/study/data";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OpenBook } from "@/components/art/open-book";
import { StudyTabs } from "@/components/study/study-tabs";

export const metadata: Metadata = {
  title: "Archive",
};

function weekStart(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export default async function ArchivePage() {
  const [today, archive] = await Promise.all([
    getCircleToday(),
    getArchiveData(),
  ]);

  const thisWeek = weekStart(today);
  const groups = new Map<string, typeof archive.days>();
  for (const day of archive.days) {
    const key = weekStart(day.date);
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }

  return (
    <div className="space-y-7">
      <StudyTabs />

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          The road behind
        </p>
        <h1 className="type-title text-ink">Archive</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
          Every past reading stays open. Catch up without hurry, or return to a
          conversation that stayed with you.
        </p>
      </header>

      {!archive.available ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          title="The archive isn't set up yet"
          description="Apply the Phase 3 migration to keep past readings and conversations here."
        />
      ) : archive.days.length === 0 ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          eyebrow="Day by day"
          title="The archive is quiet"
          description="Past readings will gather here as the circle moves through Scripture."
        />
      ) : (
        <div className="space-y-7">
          {Array.from(groups.entries()).map(([week, days]) => (
            <section key={week} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  {week === thisWeek
                    ? "This week"
                    : `Week of ${formatPlanDate(week, false)}`}
                </h2>
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="overflow-hidden rounded-card border border-line bg-surface">
                {days.map((day, index) => (
                  <Link
                    key={day.date}
                    href={`/today?date=${day.date}`}
                    className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-surface-soft/55 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus ${
                      index > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {day.referenceText}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {formatPlanDate(day.date)}
                      </p>
                    </div>
                    {day.date === today ? (
                      <Badge tone="sage">Today</Badge>
                    ) : day.postCount > 0 ? (
                      <span className="shrink-0 text-xs text-ink-soft">
                        {day.postCount}{" "}
                        {day.postCount === 1 ? "thought" : "thoughts"}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-ink-soft">
                        Reading
                      </span>
                    )}
                    <span
                      aria-hidden
                      className="text-ink-soft transition group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
