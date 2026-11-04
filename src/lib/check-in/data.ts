import { signedAvatarUrls } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";
import type {
  CheckInData,
  CheckInPresence,
  CheckInView,
  EncouragementView,
} from "@/lib/check-in/types";
import type { CheckInMood } from "@/lib/validation/check-in";

type CheckInRow = {
  week_start: string;
  mood: CheckInMood | null;
  note: string | null;
  updated_at: string | null;
  checked_in: boolean;
};

type PresenceRow = {
  week_start: string;
  circle_size: number | string;
  checked_in_count: number | string;
  viewer_checked_in: boolean;
};

type EncouragementRow = {
  id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender_id: string;
  sender_name: string;
  sender_avatar_path: string | null;
};

const EMPTY: CheckInData = {
  available: false,
  checkIn: null,
  presence: null,
  encouragements: [],
  unreadCount: 0,
};

function checkInView(row: CheckInRow | undefined): CheckInView | null {
  if (!row) return null;

  return {
    weekStart: row.week_start,
    mood: row.mood,
    note: row.note,
    updatedAt: row.updated_at,
    checkedIn: Boolean(row.checked_in),
  };
}

function presenceView(row: PresenceRow | undefined): CheckInPresence | null {
  if (!row) return null;

  return {
    weekStart: row.week_start,
    circleSize: Number(row.circle_size) || 0,
    checkedInCount: Number(row.checked_in_count) || 0,
    viewerCheckedIn: Boolean(row.viewer_checked_in),
  };
}

export async function getCheckInData(): Promise<CheckInData> {
  try {
    const supabase = await createClient();
    const [checkInResult, presenceResult, encouragementsResult] =
      await Promise.all([
        supabase.rpc("get_my_check_in"),
        supabase.rpc("get_check_in_presence"),
        supabase.rpc("get_my_encouragements", { p_limit: 30 }),
      ]);

    if (
      checkInResult.error ||
      presenceResult.error ||
      encouragementsResult.error
    ) {
      return EMPTY;
    }

    const checkInRows = (checkInResult.data ?? []) as unknown as CheckInRow[];
    const presenceRows = (presenceResult.data ??
      []) as unknown as PresenceRow[];
    const rows = (encouragementsResult.data ??
      []) as unknown as EncouragementRow[];

    const urls = await signedAvatarUrls(
      supabase,
      rows.map((row) => row.sender_avatar_path),
    );

    const encouragements: EncouragementView[] = rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      readAt: row.read_at,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderAvatarUrl: row.sender_avatar_path
        ? (urls.get(row.sender_avatar_path) ?? null)
        : null,
    }));

    return {
      available: true,
      checkIn: checkInView(checkInRows[0]),
      presence: presenceView(presenceRows[0]),
      encouragements,
      unreadCount: encouragements.filter((item) => !item.readAt).length,
    };
  } catch {
    return EMPTY;
  }
}
