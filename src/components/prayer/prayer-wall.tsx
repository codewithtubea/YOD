"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Candle } from "@/components/art/candle";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { loadMorePrayers } from "@/lib/prayer/actions";
import type { PrayerView, PrayerWallData } from "@/lib/prayer/types";
import { PrayerCard } from "./prayer-card";
import { PrayerComposer } from "./prayer-composer";

export function PrayerWall({ initial }: { initial: PrayerWallData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [prayers, setPrayers] = useState(initial.prayers);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previousInitial, setPreviousInitial] = useState(initial);

  if (previousInitial !== initial) {
    setPreviousInitial(initial);
    setPrayers(initial.prayers);
    setHasMore(initial.hasMore);
    setNextCursor(initial.nextCursor);
  }

  useEffect(() => {
    function refreshVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }

    window.addEventListener("focus", refreshVisible);
    const timer = window.setInterval(refreshVisible, 90_000);

    return () => {
      window.removeEventListener("focus", refreshVisible);
      window.clearInterval(timer);
    };
  }, [router]);

  function addOptimistic(body: string) {
    const id = `optimistic-prayer-${Date.now()}`;
    const optimistic: PrayerView = {
      id,
      body,
      status: "open",
      createdAt: new Date().toISOString(),
      answeredAt: null,
      viewerIsAuthor: true,
      prayedCount: 0,
      viewerPrayed: false,
      updates: [],
    };

    setPrayers((current) => [optimistic, ...current]);
    return id;
  }

  function rollbackOptimistic(id: string) {
    setPrayers((current) => current.filter((prayer) => prayer.id !== id));
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await loadMorePrayers({ cursor: nextCursor });
    setLoadingMore(false);

    if (!result.ok) {
      toast({
        title: "Couldn't load more",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setPrayers((current) => {
      const known = new Set(current.map((prayer) => prayer.id));
      return [
        ...current,
        ...result.data.prayers.filter((prayer) => !known.has(prayer.id)),
      ];
    });
    setHasMore(result.data.hasMore);
    setNextCursor(result.data.nextCursor);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-soft border border-sage/40 bg-sage-soft/45 px-4 py-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-gold">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l7 3v5c0 4.4-2.9 8.1-7 10-4.1-1.9-7-5.6-7-10V6l7-3Z" />
            <path d="M9.5 12l1.7 1.7L15 10" />
          </svg>
        </span>
        <p className="text-xs leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">Anonymous by design.</span>{" "}
          No names or profiles appear here. Authorship is held privately so you
          can manage your own prayer.
        </p>
      </div>

      <PrayerComposer
        onOptimistic={addOptimistic}
        onRollback={rollbackOptimistic}
      />

      {prayers.length === 0 ? (
        <EmptyState
          icon={<Candle size={28} lit animated />}
          eyebrow="The wall is quiet"
          title="No prayers yet"
          description="Share the first prayer, or come back and hold someone else's before God."
        />
      ) : (
        <div className="space-y-5">
          {prayers.map((prayer) => (
            <PrayerCard key={prayer.id} prayer={prayer} />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="quiet" onClick={loadMore} loading={loadingMore}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
