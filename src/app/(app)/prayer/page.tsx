import type { Metadata } from "next";

import { Candle } from "@/components/art/candle";
import { PrayerWall } from "@/components/prayer/prayer-wall";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveMember } from "@/lib/auth";
import { getPrayerWall } from "@/lib/prayer/data";

export const metadata: Metadata = {
  title: "Prayer",
};

export default async function PrayerPage() {
  await requireActiveMember();
  const data = await getPrayerWall();

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-5">
        <div>
          <p className="type-caption font-semibold text-gold">Prayer</p>
          <h1 className="type-title mt-2 text-ink">Held in confidence.</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
            Share a prayer without your name. The circle can quietly say “I
            prayed,” and you can add an update when there is news.
          </p>
        </div>
        <div className="hidden shrink-0 rounded-full bg-gold-soft/60 p-3 text-gold sm:block">
          <Candle size={46} lit animated />
        </div>
      </header>

      {data.available ? (
        <PrayerWall initial={data} />
      ) : (
        <EmptyState
          icon={<Candle size={28} lit animated />}
          eyebrow="One small setup step"
          title="The prayer wall is waiting"
          description="Apply the prayer migration in Supabase to open anonymous prayer requests, “I prayed,” and author updates."
        />
      )}
    </div>
  );
}
