import { cache } from "react";

import { getCircleSettings } from "@/lib/circle";
import { signedAvatarUrls } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";
import type { CircleSettings } from "@/lib/circle";
import type { CheckInMood } from "@/lib/validation/check-in";
import type {
  AdminCareMember,
  AdminCareSummary,
  AdminConcern,
  AdminCounts,
  AdminInvite,
  AdminMember,
  AdminQuestion,
  AdminReport,
  AdminUnansweredThought,
  Announcement,
  AuditEntry,
  HiddenContent,
  SermonLink,
} from "./types";

type CountsRow = {
  members_active: number;
  members_pending: number;
  members_total: number;
  admins: number;
  pending_reports: number;
  pending_concerns: number;
  pending_questions: number;
  hidden_content: number;
  pending_invites: number;
  upcoming_readings: number;
  current_announcement: { id: string; title: string } | null;
  last_audit_at: string | null;
};

type MemberRow = {
  id: string;
  display_name: string;
  email: string;
  role: "member" | "admin";
  status: "pending" | "active" | "deactivated";
  joined_at: string;
  last_sign_in_at: string | null;
  deactivated_at: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: "member" | "admin";
  status: AdminInvite["status"];
  personal_note: string | null;
  invited_by_name: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  last_shared_at: string | null;
};

type ReportRow = {
  id: string;
  target_type: "post" | "reply";
  target_id: string;
  reason: AdminReport["reason"];
  note: string | null;
  status: AdminReport["status"];
  reporter_name: string;
  target_body: string;
  target_author: string;
  target_plan_date: string | null;
  target_hidden_at: string | null;
  created_at: string;
  resolution_note: string | null;
  resolved_at: string | null;
};

type QuestionRow = {
  id: string;
  body: string;
  author_name: string;
  plan_date: string;
  status: "open" | "answered";
  reply_count: number | string;
  answered_reply_id: string | null;
  created_at: string;
  hidden_at: string | null;
};

type AuditRow = {
  id: string;
  actor_label: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  starts_at: string;
  ends_at: string | null;
  archived_at: string | null;
  created_at: string;
  creator: { display_name: string } | { display_name: string }[] | null;
};

type SermonRow = {
  id: string;
  title: string;
  url: string;
  provider: "youtube" | "vimeo" | "other";
  provider_id: string | null;
  is_published: boolean;
  published_on: string;
  created_at: string;
};

type HiddenPostRow = {
  id: string;
  body: string;
  plan_date: string;
  hidden_at: string;
  hidden_reason: string | null;
  author: { display_name: string } | { display_name: string }[] | null;
};

type HiddenReplyRow = {
  id: string;
  body: string;
  hidden_at: string;
  hidden_reason: string | null;
  author: { display_name: string } | { display_name: string }[] | null;
  post: { plan_date: string } | { plan_date: string }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getAdminCounts(): Promise<{
  available: boolean;
  counts: AdminCounts;
}> {
  const empty: AdminCounts = {
    membersActive: 0,
    membersPending: 0,
    membersTotal: 0,
    admins: 0,
    pendingReports: 0,
    pendingConcerns: 0,
    pendingQuestions: 0,
    hiddenContent: 0,
    pendingInvites: 0,
    upcomingReadings: 0,
    currentAnnouncement: null,
    lastAuditAt: null,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_overview_counts");

    if (error || !data) return { available: false, counts: empty };
    const row = data as CountsRow;

    return {
      available: true,
      counts: {
        membersActive: Number(row.members_active) || 0,
        membersPending: Number(row.members_pending) || 0,
        membersTotal: Number(row.members_total) || 0,
        admins: Number(row.admins) || 0,
        pendingReports: Number(row.pending_reports) || 0,
        pendingConcerns: Number(row.pending_concerns) || 0,
        pendingQuestions: Number(row.pending_questions) || 0,
        hiddenContent: Number(row.hidden_content) || 0,
        pendingInvites: Number(row.pending_invites) || 0,
        upcomingReadings: Number(row.upcoming_readings) || 0,
        currentAnnouncement: row.current_announcement ?? null,
        lastAuditAt: row.last_audit_at ?? null,
      },
    };
  } catch {
    return { available: false, counts: empty };
  }
}

export async function getAdminMembers(search = ""): Promise<{
  available: boolean;
  members: AdminMember[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_members", {
      p_search: search.trim() || null,
    });

    if (error || !data) return { available: false, members: [] };

    return {
      available: true,
      members: (data as MemberRow[]).map((row) => ({
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        role: row.role,
        status: row.status,
        joinedAt: row.joined_at,
        lastSignInAt: row.last_sign_in_at,
        deactivatedAt: row.deactivated_at,
      })),
    };
  } catch {
    return { available: false, members: [] };
  }
}

export async function getAdminInvites(): Promise<{
  available: boolean;
  invites: AdminInvite[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_invites");

    if (error || !data) return { available: false, invites: [] };

    return {
      available: true,
      invites: (data as InviteRow[]).map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        personalNote: row.personal_note,
        invitedByName: row.invited_by_name,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        revokedAt: row.revoked_at,
        lastSharedAt: row.last_shared_at,
      })),
    };
  } catch {
    return { available: false, invites: [] };
  }
}

type ConcernRow = {
  id: string;
  category: AdminConcern["category"];
  subject: string;
  body: string;
  status: AdminConcern["status"];
  author_name: string;
  created_at: string;
  resolved_at: string | null;
  admin_note: string | null;
};

export async function getAdminConcerns(): Promise<{
  available: boolean;
  concerns: AdminConcern[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_concerns", {
      p_status: "all",
    });

    if (error || !data) return { available: false, concerns: [] };

    return {
      available: true,
      concerns: (data as ConcernRow[]).map((row) => ({
        id: row.id,
        category: row.category,
        subject: row.subject,
        body: row.body,
        status: row.status,
        authorName: row.author_name,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        adminNote: row.admin_note,
      })),
    };
  } catch {
    return { available: false, concerns: [] };
  }
}

export async function getAdminReports(
  status: "pending" | "resolved" | "all" = "pending",
): Promise<{ available: boolean; reports: AdminReport[] }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_reports", {
      p_status: status,
    });

    if (error || !data) return { available: false, reports: [] };

    return {
      available: true,
      reports: (data as ReportRow[]).map((row) => ({
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        note: row.note,
        status: row.status,
        reporterName: row.reporter_name,
        targetBody: row.target_body,
        targetAuthor: row.target_author,
        targetPlanDate: row.target_plan_date,
        targetHiddenAt: row.target_hidden_at,
        createdAt: row.created_at,
        resolutionNote: row.resolution_note,
        resolvedAt: row.resolved_at,
      })),
    };
  } catch {
    return { available: false, reports: [] };
  }
}

export async function getAdminQuestions(
  filter: "open" | "answered" | "all" = "open",
): Promise<{ available: boolean; questions: AdminQuestion[] }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_questions", {
      p_filter: filter,
    });

    if (error || !data) return { available: false, questions: [] };

    return {
      available: true,
      questions: (data as QuestionRow[]).map((row) => ({
        id: row.id,
        body: row.body,
        authorName: row.author_name,
        planDate: row.plan_date,
        status: row.status,
        replyCount: Number(row.reply_count) || 0,
        answeredReplyId: row.answered_reply_id,
        createdAt: row.created_at,
        hiddenAt: row.hidden_at,
      })),
    };
  } catch {
    return { available: false, questions: [] };
  }
}

export async function getAuditEntries(
  limit = 100,
  action = "",
): Promise<{ available: boolean; entries: AuditEntry[] }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_audit", {
      p_limit: limit,
      p_action: action.trim() || null,
    });

    if (error || !data) return { available: false, entries: [] };

    return {
      available: true,
      entries: (data as AuditRow[]).map((row) => ({
        id: row.id,
        actorLabel: row.actor_label,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        metadata: row.metadata ?? {},
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { available: false, entries: [] };
  }
}

export async function getAdminAnnouncements(): Promise<{
  available: boolean;
  announcements: Announcement[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id, title, body, starts_at, ends_at, archived_at, created_at, creator:profiles!announcements_created_by_fkey(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { available: false, announcements: [] };

    return {
      available: true,
      announcements: ((data ?? []) as unknown as AnnouncementRow[]).map(
        (row) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          archivedAt: row.archived_at,
          createdAt: row.created_at,
          createdByName: first(row.creator)?.display_name ?? "Circle admin",
        }),
      ),
    };
  } catch {
    return { available: false, announcements: [] };
  }
}

export const getCurrentAnnouncement = cache(
  async (): Promise<Announcement | null> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, title, body, starts_at, ends_at, archived_at, created_at, creator:profiles!announcements_created_by_fkey(display_name)",
        )
        .is("archived_at", null)
        .lte("starts_at", new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      const row = data as unknown as AnnouncementRow;
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        archivedAt: row.archived_at,
        createdAt: row.created_at,
        createdByName: first(row.creator)?.display_name ?? "Circle admin",
      };
    } catch {
      return null;
    }
  },
);

export async function getHiddenContent(): Promise<{
  available: boolean;
  items: HiddenContent[];
}> {
  try {
    const supabase = await createClient();
    const [posts, replies] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "id, body, plan_date, hidden_at, hidden_reason, author:profiles!posts_author_id_fkey(display_name)",
        )
        .not("hidden_at", "is", null)
        .is("deleted_at", null)
        .order("hidden_at", { ascending: false })
        .limit(100),
      supabase
        .from("replies")
        .select(
          "id, body, hidden_at, hidden_reason, author:profiles!replies_author_id_fkey(display_name), post:posts!replies_post_id_fkey(plan_date)",
        )
        .not("hidden_at", "is", null)
        .is("deleted_at", null)
        .order("hidden_at", { ascending: false })
        .limit(100),
    ]);

    if (posts.error || replies.error) {
      return { available: false, items: [] };
    }

    const items: HiddenContent[] = [
      ...((posts.data ?? []) as unknown as HiddenPostRow[]).map((row) => ({
        id: row.id,
        targetType: "post" as const,
        body: row.body,
        authorName: first(row.author)?.display_name ?? "Member",
        planDate: row.plan_date,
        hiddenAt: row.hidden_at,
        hiddenReason: row.hidden_reason,
      })),
      ...((replies.data ?? []) as unknown as HiddenReplyRow[]).map((row) => ({
        id: row.id,
        targetType: "reply" as const,
        body: row.body,
        authorName: first(row.author)?.display_name ?? "Member",
        planDate: first(row.post)?.plan_date ?? null,
        hiddenAt: row.hidden_at,
        hiddenReason: row.hidden_reason,
      })),
    ].sort((a, b) => b.hiddenAt.localeCompare(a.hiddenAt));

    return { available: true, items };
  } catch {
    return { available: false, items: [] };
  }
}

export async function getSermonLinks({
  publishedOnly = false,
}: { publishedOnly?: boolean } = {}): Promise<{
  available: boolean;
  links: SermonLink[];
}> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("sermon_links")
      .select(
        "id, title, url, provider, provider_id, is_published, published_on, created_at",
      )
      .order("published_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (publishedOnly) query = query.eq("is_published", true);

    const { data, error } = await query;
    if (error) return { available: false, links: [] };

    return {
      available: true,
      links: ((data ?? []) as unknown as SermonRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        provider: row.provider,
        providerId: row.provider_id,
        isPublished: row.is_published,
        publishedOn: row.published_on,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { available: false, links: [] };
  }
}

export async function getAdminSettings(): Promise<CircleSettings> {
  return getCircleSettings();
}

type CareSummaryRow = {
  week_start: string;
  circle_size: number | string;
  checked_in_count: number | string;
  grateful: number | string;
  steady: number | string;
  heavy: number | string;
  resting: number | string;
};

type CareMemberRow = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  checked_in: boolean;
  mood: CheckInMood | null;
  note: string | null;
  checked_in_at: string | null;
};

type UnansweredThoughtRow = {
  id: string;
  body: string;
  plan_date: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

export async function getAdminCareSummary(): Promise<{
  available: boolean;
  summary: AdminCareSummary | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_get_care_summary");

    if (error) return { available: false, summary: null };

    const row = ((data ?? []) as unknown as CareSummaryRow[])[0];
    if (!row) return { available: true, summary: null };

    return {
      available: true,
      summary: {
        weekStart: row.week_start,
        circleSize: Number(row.circle_size) || 0,
        checkedInCount: Number(row.checked_in_count) || 0,
        moods: {
          grateful: Number(row.grateful) || 0,
          steady: Number(row.steady) || 0,
          heavy: Number(row.heavy) || 0,
          resting: Number(row.resting) || 0,
        },
      },
    };
  } catch {
    return { available: false, summary: null };
  }
}

export async function getAdminCareMembers(): Promise<{
  available: boolean;
  members: AdminCareMember[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_care_members");

    if (error || !data) return { available: false, members: [] };

    const rows = data as unknown as CareMemberRow[];
    const urls = await signedAvatarUrls(
      supabase,
      rows.map((row) => row.avatar_path),
    );

    return {
      available: true,
      members: rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        avatarUrl: row.avatar_path
          ? (urls.get(row.avatar_path) ?? null)
          : null,
        checkedIn: Boolean(row.checked_in),
        mood: row.mood,
        note: row.note,
        checkedInAt: row.checked_in_at,
      })),
    };
  } catch {
    return { available: false, members: [] };
  }
}

export async function getAdminUnansweredThoughts(days = 1): Promise<{
  available: boolean;
  thoughts: AdminUnansweredThought[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "admin_list_unanswered_thoughts",
      { p_days: days },
    );

    if (error || !data) return { available: false, thoughts: [] };

    return {
      available: true,
      thoughts: (data as unknown as UnansweredThoughtRow[]).map((row) => ({
        id: row.id,
        body: row.body,
        planDate: row.plan_date,
        authorId: row.author_id,
        authorName: row.author_name,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { available: false, thoughts: [] };
  }
}
