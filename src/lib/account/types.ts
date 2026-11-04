import type { MemberRole, MemberStatus } from "@/lib/types";

export type MyAccount = {
  id: string;
  displayName: string;
  bio: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  onboardedAt: string | null;
  email: string;
  role: MemberRole;
  status: MemberStatus;
};

export type MemberProfile = {
  id: string;
  displayName: string;
  bio: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  joinedAt: string;
};

export type MemberSettings = {
  reduceMotion: boolean;
  theme: "system" | "light" | "dark";
  textSize: "default" | "large";
  notifyReplies: boolean;
  notifyAmens: boolean;
  notifyAnswered: boolean;
  notifyEncouragements: boolean;
  hasRow: boolean;
  available: boolean;
};

export type MyContributions = {
  thoughts: number;
  replies: number;
  prayersShared: number;
};

export type ContactCategory =
  | "account"
  | "privacy"
  | "content"
  | "technical"
  | "other";

export type AdminConcern = {
  id: string;
  category: ContactCategory;
  subject: string;
  body: string;
  status: "new" | "resolved";
  authorName: string;
  createdAt: string;
  resolvedAt: string | null;
  adminNote: string | null;
};
