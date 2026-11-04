export type PrayerStatus = "open" | "answered";

export type PrayerUpdateView = {
  id: string;
  body: string;
  createdAt: string;
};

export type PrayerView = {
  id: string;
  body: string;
  status: PrayerStatus;
  createdAt: string;
  answeredAt: string | null;
  viewerIsAuthor: boolean;
  prayedCount: number;
  viewerPrayed: boolean;
  updates: PrayerUpdateView[];
};

export type PrayerWallData = {
  available: boolean;
  prayers: PrayerView[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type PrayerActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
