import type { Metadata } from "next";

import { requireActiveMember } from "@/lib/auth";
import { formatCircleDate } from "@/lib/date";

export const metadata: Metadata = {
  title: "Today",
};

export default async function TodayPage() {
  const { membership } = await requireActiveMember();

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          {formatCircleDate()}
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Welcome, {membership.display_name}.
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
          You&apos;re in. This is your quiet place for the daily chapter,
          prayer, and care.
        </p>
      </header>

      <section className="rounded-3xl border border-line bg-surface/80 p-6 shadow-lg shadow-forest/5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          A quiet start
        </p>
        <h2 className="mt-3 font-serif text-2xl leading-snug text-ink">
          The circle is ready for its first chapter.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Daily Scripture, reflections, prayer, and check-ins arrive next. For
          now, your account and invitation are verified.
        </p>
      </section>

      <p className="text-xs leading-relaxed text-ink-soft/80">
        No streaks, no scores. Just a place to show up.
      </p>
    </div>
  );
}
