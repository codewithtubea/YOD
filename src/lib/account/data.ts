import { cache } from "react";

import { signedAvatarUrl, signedAvatarUrls } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";
import type {
  MemberProfile,
  MemberSettings,
  MyAccount,
  MyContributions,
} from "@/lib/account/types";
import type { MemberRole, MemberStatus } from "@/lib/types";

type AccountRow = {
  id: string;
  display_name: string;
  bio: string | null;
  birthday: string | null;
  avatar_path: string | null;
  joined_at: string;
  onboarded_at: string | null;
  email: string;
  role: MemberRole;
  status: MemberStatus;
};

type DirectoryRow = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  joined_at: string;
};

type SettingsRow = {
  reduce_motion: boolean;
  theme: "system" | "light" | "dark";
  text_size: "default" | "large";
  notify_replies: boolean;
  notify_amens: boolean;
  notify_answered: boolean;
  notify_encouragements: boolean;
};

type BirthdayRow = {
  user_id: string;
  display_name: string;
};

export type MyAccountResult = {
  available: boolean;
  account: MyAccount | null;
};

export const EMPTY_MEMBER_SETTINGS: MemberSettings = {
  reduceMotion: false,
  theme: "system",
  textSize: "default",
  notifyReplies: true,
  notifyAmens: true,
  notifyAnswered: true,
  notifyEncouragements: true,
  hasRow: false,
  available: true,
};

function accountFromRow(row: AccountRow, avatarUrl: string | null): MyAccount {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    birthday: row.birthday,
    avatarPath: row.avatar_path,
    avatarUrl,
    joinedAt: row.joined_at,
    onboardedAt: row.onboarded_at,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

export const getMyAccount = cache(async (): Promise<MyAccountResult> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_my_account")
      .maybeSingle<AccountRow>();

    if (error || !data) return { available: false, account: null };

    const avatarUrl = await signedAvatarUrl(supabase, data.avatar_path);
    return { available: true, account: accountFromRow(data, avatarUrl) };
  } catch {
    return { available: false, account: null };
  }
});

export const getMemberProfile = cache(
  async (id: string): Promise<MemberProfile | null> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("member_directory")
        .select("id, display_name, bio, avatar_path, joined_at")
        .eq("id", id)
        .maybeSingle<DirectoryRow>();

      if (error || !data) return null;

      const avatarUrl = await signedAvatarUrl(supabase, data.avatar_path);
      return {
        id: data.id,
        displayName: data.display_name,
        bio: data.bio,
        birthday: null,
        avatarPath: data.avatar_path,
        avatarUrl,
        joinedAt: data.joined_at,
      };
    } catch {
      return null;
    }
  },
);

export const getMemberDirectory = cache(
  async (): Promise<{ available: boolean; members: MemberProfile[] }> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("member_directory")
        .select("id, display_name, bio, avatar_path, joined_at")
        .order("display_name", { ascending: true })
        .limit(500);

      if (error || !data) return { available: false, members: [] };

      const rows = data as DirectoryRow[];
      const urls = await signedAvatarUrls(
        supabase,
        rows.map((row) => row.avatar_path),
      );

      return {
        available: true,
        members: rows.map((row) => ({
          id: row.id,
          displayName: row.display_name,
          bio: row.bio,
          birthday: null,
          avatarPath: row.avatar_path,
          avatarUrl: row.avatar_path ? (urls.get(row.avatar_path) ?? null) : null,
          joinedAt: row.joined_at,
        })),
      };
    } catch {
      return { available: false, members: [] };
    }
  },
);

export const getMemberSettings = cache(
  async (): Promise<MemberSettings> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("member_settings")
        .select(
          "reduce_motion, theme, text_size, notify_replies, notify_amens, notify_answered, notify_encouragements",
        )
        .maybeSingle<SettingsRow>();

      if (error) return { ...EMPTY_MEMBER_SETTINGS, available: false };
      if (!data) return EMPTY_MEMBER_SETTINGS;

      return {
        reduceMotion: data.reduce_motion,
        theme: data.theme,
        textSize: data.text_size,
        notifyReplies: data.notify_replies,
        notifyAmens: data.notify_amens,
        notifyAnswered: data.notify_answered,
        notifyEncouragements: data.notify_encouragements,
        hasRow: true,
        available: true,
      };
    } catch {
      return { ...EMPTY_MEMBER_SETTINGS, available: false };
    }
  },
);

export const getMyContributions = cache(
  async (): Promise<MyContributions> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .rpc("get_my_contribution_counts")
        .maybeSingle<{
          thoughts: number | string;
          replies: number | string;
          prayers_shared: number | string;
        }>();

      if (error || !data) return { thoughts: 0, replies: 0, prayersShared: 0 };

      return {
        thoughts: Number(data.thoughts) || 0,
        replies: Number(data.replies) || 0,
        prayersShared: Number(data.prayers_shared) || 0,
      };
    } catch {
      return { thoughts: 0, replies: 0, prayersShared: 0 };
    }
  },
);

export const getTodayBirthdays = cache(
  async (): Promise<{ available: boolean; names: string[] }> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("get_today_birthdays");

      if (error || !data) return { available: false, names: [] };

      const names = (data as BirthdayRow[])
        .map((row) => row.display_name)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));

      return { available: names.length > 0, names };
    } catch {
      return { available: false, names: [] };
    }
  },
);
