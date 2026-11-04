import type { CheckInMood } from "@/lib/validation/check-in";

export type CheckInView = {
  weekStart: string;
  mood: CheckInMood | null;
  note: string | null;
  updatedAt: string | null;
  checkedIn: boolean;
};

export type CheckInPresence = {
  weekStart: string;
  circleSize: number;
  checkedInCount: number;
  viewerCheckedIn: boolean;
};

export type EncouragementView = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
};

export type CheckInData = {
  available: boolean;
  checkIn: CheckInView | null;
  presence: CheckInPresence | null;
  encouragements: EncouragementView[];
  unreadCount: number;
};

export type CheckInActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
