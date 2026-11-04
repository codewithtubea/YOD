import { makePrayerCursor, type PrayerCursor } from "@/lib/prayer/cursor";
import type {
  PrayerStatus,
  PrayerUpdateView,
  PrayerView,
  PrayerWallData,
} from "@/lib/prayer/types";
import { createClient } from "@/lib/supabase/server";

type PrayerUpdateRow = {
  id: string;
  body: string;
  created_at: string;
};

type PrayerRow = {
  id: string;
  body: string;
  status: PrayerStatus;
  created_at: string;
  answered_at: string | null;
  viewer_is_author: boolean;
  prayed_count: number | string;
  viewer_prayed: boolean;
  updates: PrayerUpdateRow[] | null;
};

function updateView(row: PrayerUpdateRow): PrayerUpdateView {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function prayerView(row: PrayerRow): PrayerView {
  return {
    id: row.id,
    body: row.body,
    status: row.status === "answered" ? "answered" : "open",
    createdAt: row.created_at,
    answeredAt: row.answered_at,
    viewerIsAuthor: Boolean(row.viewer_is_author),
    prayedCount: Number(row.prayed_count) || 0,
    viewerPrayed: Boolean(row.viewer_prayed),
    updates: Array.isArray(row.updates)
      ? row.updates.map(updateView)
      : [],
  };
}

export async function getPrayerWall({
  limit = 20,
  cursor,
}: {
  limit?: number;
  cursor?: PrayerCursor | null;
} = {}): Promise<PrayerWallData> {
  const fallback: PrayerWallData = {
    available: false,
    prayers: [],
    hasMore: false,
    nextCursor: null,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_prayer_wall", {
      p_limit: limit,
      p_before: cursor?.createdAt ?? null,
      p_before_id: cursor?.id ?? null,
    });

    if (error) return fallback;

    const rows = (data ?? []) as unknown as PrayerRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows.at(-1);

    return {
      available: true,
      prayers: pageRows.map(prayerView),
      hasMore,
      nextCursor:
        hasMore && last
          ? makePrayerCursor(last.created_at, last.id)
          : null,
    };
  } catch {
    return fallback;
  }
}
