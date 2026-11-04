import type { MemberRole, MemberStatus } from "@/lib/types";
import type { CheckInMood } from "@/lib/validation/check-in";

export type AdminModuleId =
  | "overview"
  | "members"
  | "care"
  | "reading"
  | "affirmations"
  | "moderation"
  | "questions"
  | "announcements"
  | "sermons"
  | "settings"
  | "audit";

export type AdminCounts = {
  membersActive: number;
  membersPending: number;
  membersTotal: number;
  admins: number;
  pendingReports: number;
  pendingConcerns: number;
  pendingQuestions: number;
  hiddenContent: number;
  pendingInvites: number;
  upcomingReadings: number;
  currentAnnouncement: { id: string; title: string } | null;
  lastAuditAt: string | null;
};

export type AdminMember = {
  id: string;
  displayName: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  lastSignInAt: string | null;
  deactivatedAt: string | null;
};

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired" | "left";

export type AdminInvite = {
  id: string;
  email: string;
  role: MemberRole;
  status: InviteStatus;
  personalNote: string | null;
  invitedByName: string;
  createdAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSharedAt: string | null;
};

export type ReportReason = "unkind" | "unsafe" | "private" | "other";
export type ReportStatus = "pending" | "resolved";

export type AdminReport = {
  id: string;
  targetType: "post" | "reply";
  targetId: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  reporterName: string;
  targetBody: string;
  targetAuthor: string;
  targetPlanDate: string | null;
  targetHiddenAt: string | null;
  createdAt: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
};

export type AdminQuestion = {
  id: string;
  body: string;
  authorName: string;
  planDate: string;
  status: "open" | "answered";
  replyCount: number;
  answeredReplyId: string | null;
  createdAt: string;
  hiddenAt: string | null;
};

export type AdminConcern = {
  id: string;
  category: "account" | "privacy" | "content" | "technical" | "other";
  subject: string;
  body: string;
  status: "new" | "resolved";
  authorName: string;
  createdAt: string;
  resolvedAt: string | null;
  adminNote: string | null;
};

export type AuditEntry = {
  id: string;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  createdByName: string;
};

export type SermonLink = {
  id: string;
  title: string;
  url: string;
  provider: "youtube" | "vimeo" | "other";
  providerId: string | null;
  isPublished: boolean;
  publishedOn: string;
  createdAt: string;
};

export type HiddenContent = {
  id: string;
  targetType: "post" | "reply";
  body: string;
  authorName: string;
  planDate: string | null;
  hiddenAt: string;
  hiddenReason: string | null;
};

export type AdminCareSummary = {
  weekStart: string;
  circleSize: number;
  checkedInCount: number;
  moods: Record<CheckInMood, number>;
};

export type AdminCareMember = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  checkedIn: boolean;
  mood: CheckInMood | null;
  note: string | null;
  checkedInAt: string | null;
};

export type AdminUnansweredThought = {
  id: string;
  body: string;
  planDate: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};
