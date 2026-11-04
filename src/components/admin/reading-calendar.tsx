"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  buildMonthGrid,
  findReadingGaps,
  monthFromIso,
  monthLabel,
  readingsMap,
  shiftMonth,
} from "@/lib/admin/calendar";
import { formatAdminDay } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ReadingCalendar({
  plans,
  today,
}: {
  plans: { date: string; referenceText: string }[];
  today: string;
}) {
  const initial = monthFromIso(today);
  const [cursor, setCursor] = useState(initial);
  const readings = useMemo(() => readingsMap(plans), [plans]);
  const weeks = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, readings, today),
    [cursor.year, cursor.month, readings, today],
  );
  const gaps = useMemo(
    () => findReadingGaps(readings, today, 14),
    [readings, today],
  );

  return (
    <section aria-labelledby="reading-calendar-title" className="border-y border-line py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="reading-calendar-title" className="type-section-title text-ink">
            Plan calendar
          </h2>
          <p className="type-meta mt-1 text-ink-soft">
            Scheduled days are marked. Future readings stay hidden from members.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous month"
            onClick={() => setCursor((current) => shiftMonth(current.year, current.month, -1))}
          >
            <ChevronLeft aria-hidden size={18} />
          </Button>
          <p className="min-w-36 text-center text-sm font-medium text-ink">
            {monthLabel(cursor.year, cursor.month)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next month"
            onClick={() => setCursor((current) => shiftMonth(current.year, current.month, 1))}
          >
            <ChevronRight aria-hidden size={18} />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="overflow-x-auto">
          <div className="min-w-[34rem]">
            <div className="grid grid-cols-7 border-b border-line pb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="type-label text-center text-[0.625rem] text-ink-soft"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weeks.flat().map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "min-h-20 border-b border-r border-line p-2 last:border-r-0",
                    !day.inMonth && "bg-surface-soft/30 text-ink-soft/45",
                    day.isToday && "bg-sage-soft/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "font-mono text-[0.6875rem] tabular",
                        day.isToday ? "font-semibold text-forest dark:text-ink" : "text-ink-soft",
                      )}
                    >
                      {day.day}
                    </span>
                    {day.isToday ? (
                      <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-gold">
                        Today
                      </span>
                    ) : null}
                  </div>
                  {day.reference ? (
                    <p className="mt-1 line-clamp-2 text-[0.6875rem] leading-snug text-ink">
                      {day.reference}
                    </p>
                  ) : day.inMonth ? (
                    <p className="mt-1 text-[0.625rem] text-ink-soft/50">—</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="type-label text-gold">Next 14 days</p>
          {gaps.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Every day in the next two weeks has a reading.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {gaps.length} day{gaps.length === 1 ? "" : "s"} without a reading.
              </p>
              <ul className="mt-3 space-y-1.5">
                {gaps.map((date) => (
                  <li key={date} className="flex items-center gap-2 text-sm">
                    <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                    <span className="text-ink">{formatAdminDay(date)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
