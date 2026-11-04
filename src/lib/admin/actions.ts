"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/study/types";
import {
  adminPasswordSchema,
  announcementIdSchema,
  announcementSchema,
  careNudgeSchema,
  hideContentSchema,
  inviteFormSchema,
  inviteIdSchema,
  memberApprovalSchema,
  memberRoleSchema,
  memberStatusSchema,
  parseInviteEmails,
  resolveConcernSchema,
  resolveReportSchema,
  sermonPublishSchema,
  sermonSchema,
  settingsSchema,
} from "@/lib/validation/admin";
import { parseSermonUrl } from "./sermons";
import type { AdminInvite } from "./types";

type AdminGate =
  | { ok: true; userId: string }
  | { ok: false; message: string };

async function adminGate(): Promise<AdminGate> {
  const context = await getAuthContext();

  if (!context) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }

  if (context.membership?.status !== "active") {
    return { ok: false, message: "This account is not active." };
  }

  if (context.membership.role !== "admin") {
    return { ok: false, message: "Administrator access is required." };
  }

  return { ok: true, userId: context.userId };
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

function databaseMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "We couldn't save this just now. Try again.";
  if (error.code === "42501") return "You don't have permission to do that.";
  if (error.code === "23505") return "That was already saved.";
  if (error.code === "23514" || error.code === "23503") {
    return "That change didn't pass the circle's safety checks.";
  }
  if (error.code === "PGRST202" || error.code === "PGRST205") {
    return "The admin database isn't ready yet. Apply the Phase 3B migration.";
  }
  if (error.message?.toLowerCase().includes("admin")) {
    return error.message;
  }
  return "We couldn't save this just now. Try again.";
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

export async function setMemberRole(input: {
  userId: string;
  role: "member" | "admin";
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the member and role.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function approveMember(input: {
  userId: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = memberApprovalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the member request.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_member", {
    p_user_id: parsed.data.userId,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/members");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function setMemberStatus(input: {
  userId: string;
  status: "active" | "deactivated";
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = memberStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the member and status.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_member_status", {
    p_user_id: parsed.data.userId,
    p_status: parsed.data.status,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function createInvites(input: {
  emails: string;
  role: "member" | "admin";
  personalNote?: string;
  expiryDays: number;
}): Promise<
  ActionResult<{
    created: string[];
    skipped: { email: string; reason: string }[];
  }>
> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = inviteFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the invite details.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { emails, invalid, duplicates } = parseInviteEmails(parsed.data.emails);

  if (invalid.length > 0) {
    return {
      ok: false,
      message: "Some email addresses are not valid.",
      fieldErrors: {
        emails: [`Not valid: ${invalid.slice(0, 5).join(", ")}`],
      },
    };
  }

  if (emails.length === 0) {
    return {
      ok: false,
      message: "Add at least one email address.",
      fieldErrors: { emails: ["Add at least one email address."] },
    };
  }

  if (emails.length > 30) {
    return {
      ok: false,
      message: "Create no more than 30 invites at a time.",
      fieldErrors: { emails: ["Create no more than 30 invites at a time."] },
    };
  }

  const expiresAt = new Date(
    Date.now() + parsed.data.expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_invites", {
    p_emails: emails,
    p_role: parsed.data.role,
    p_personal_note: parsed.data.personalNote,
    p_expires_at: expiresAt,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  const result = (data ?? { created: [], skipped: [] }) as {
    created: string[];
    skipped: { email: string; reason: string }[];
  };

  if (duplicates.length > 0) {
    result.skipped = [
      ...result.skipped,
      ...duplicates.map((email) => ({
        email,
        reason: "Repeated in the list",
      })),
    ];
  }

  refreshAdmin();
  revalidatePath("/admin/invites");
  revalidatePath("/admin/audit");
  return { ok: true, data: result };
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = inviteIdSchema.safeParse(inviteId);
  if (!parsed.success) return { ok: false, message: "Invite not found." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_invite", {
    p_invite_id: parsed.data,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/invites");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function markInviteShared(
  invite: AdminInvite,
): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = inviteIdSchema.safeParse(invite.id);
  if (!parsed.success) return { ok: false, message: "Invite not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invites")
    .update({ last_shared_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) return { ok: false, message: databaseMessage(error) };

  revalidatePath("/admin/invites");
  return { ok: true, data: undefined };
}

export async function reissueInvite(
  invite: AdminInvite,
  expiryDays = 14,
): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = inviteIdSchema.safeParse(invite?.id);
  const days = z.coerce.number().int().min(1).max(90).safeParse(expiryDays);
  if (!parsed.success || !days.success) return { ok: false, message: "Invite not found." };

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("invites")
    .select("id, status, expires_at, accepted_at, revoked_at")
    .eq("id", parsed.data)
    .maybeSingle();

  if (readError || !existing) return { ok: false, message: "Invite not found." };

  const row = existing as {
    status: string;
    expires_at: string | null;
    accepted_at: string | null;
    revoked_at: string | null;
  };
  const effective =
    row.accepted_at !== null
      ? "accepted"
      : row.revoked_at !== null || row.status === "revoked"
        ? "revoked"
        : row.expires_at !== null && new Date(row.expires_at).getTime() <= Date.now()
          ? "expired"
          : row.status;

  if (
    effective !== "revoked" &&
    effective !== "expired" &&
    effective !== "left"
  ) {
    return {
      ok: false,
      message: "Only a revoked, expired, or left invite can be renewed.",
    };
  }

  const { error } = await supabase
    .from("invites")
    .update({
      status: "pending",
      revoked_at: null,
      expires_at: new Date(
        Date.now() + days.data * 24 * 60 * 60 * 1000,
      ).toISOString(),
      last_shared_at: null,
    })
    .eq("id", parsed.data)
    .is("accepted_at", null);

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/invites");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function markQuestionAnswered(
  questionId: string,
): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = z.uuid("Question not found.").safeParse(questionId);
  if (!parsed.success) return { ok: false, message: "Question not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ status: "answered" })
    .eq("id", parsed.data)
    .eq("kind", "question")
    .is("hidden_at", null);

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/questions");
  revalidatePath("/today");
  revalidatePath("/today/questions");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function hideContent(input: {
  targetType: "post" | "reply";
  targetId: string;
  reason: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = hideContentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a short reason before hiding content.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_hide_content", {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/moderation");
  revalidatePath("/today");
  revalidatePath("/today/questions");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function unhideContent(input: {
  targetType: "post" | "reply";
  targetId: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = z
    .object({
      targetType: z.enum(["post", "reply"]),
      targetId: z.uuid("Choose content."),
    })
    .safeParse(input);

  if (!parsed.success) return { ok: false, message: "Content not found." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_unhide_content", {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/moderation");
  revalidatePath("/today");
  revalidatePath("/today/questions");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function resolveReport(input: {
  reportId: string;
  resolutionNote: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = resolveReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a short resolution note.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: parsed.data.reportId,
    p_resolution_note: parsed.data.resolutionNote,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  endsAt?: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the announcement.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const endsAt = parsed.data.endsAt
    ? new Date(`${parsed.data.endsAt}T23:59:59Z`).toISOString()
    : null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_announcement", {
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_ends_at: endsAt,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/announcements");
  revalidatePath("/today");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function archiveAnnouncement(
  announcementId: string,
): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = announcementIdSchema.safeParse(announcementId);
  if (!parsed.success) return { ok: false, message: "Announcement not found." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_archive_announcement", {
    p_id: parsed.data,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/announcements");
  revalidatePath("/today");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function saveSettings(input: {
  name: string;
  timezone: string;
  defaultBibleSource: "biblegateway" | "youversion";
  careInactivityDays: number;
  inviteMessageTemplate?: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the circle settings.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("circle_settings")
    .update({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      default_bible_source: parsed.data.defaultBibleSource,
      care_inactivity_days: parsed.data.careInactivityDays,
      invite_message_template: parsed.data.inviteMessageTemplate,
    })
    .eq("id", true);

  if (error) return { ok: false, message: databaseMessage(error) };

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function createSermon(input: {
  title: string;
  url: string;
  isPublished?: boolean;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = sermonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the sermon link.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const parsedUrl = parseSermonUrl(parsed.data.url);
  const supabase = await createClient();
  const { error } = await supabase.from("sermon_links").insert({
    title: parsed.data.title,
    url: parsed.data.url,
    provider: parsedUrl.provider,
    provider_id: parsedUrl.providerId,
    is_published: parsed.data.isPublished ?? true,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/sermons");
  revalidatePath("/today");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function setSermonPublished(input: {
  id: string;
  isPublished: boolean;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = sermonPublishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Sermon link not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sermon_links")
    .update({ is_published: parsed.data.isPublished })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/sermons");
  revalidatePath("/today");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function resolveConcern(input: {
  concernId: string;
  note: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = resolveConcernSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the resolution note.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_concern", {
    p_id: parsed.data.concernId,
    p_note: parsed.data.note,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/audit");
  return { ok: true, data: undefined };
}

export async function changeAdminPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = adminPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the password fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (signInError) {
    if (signInError.status === 429) {
      return {
        ok: false,
        message: "Too many attempts. Wait a moment and try again.",
      };
    }
    return {
      ok: false,
      message: "The current password is not correct.",
      fieldErrors: { currentPassword: ["The current password is not correct."] },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    if (updateError.status === 429) {
      return {
        ok: false,
        message: "Too many attempts. Wait a moment and try again.",
      };
    }
    if (updateError.message.toLowerCase().includes("same password")) {
      return {
        ok: false,
        message: "Choose a password different from the current one.",
        fieldErrors: {
          newPassword: ["Choose a password different from the current one."],
        },
      };
    }
    return {
      ok: false,
      message: "The password could not be changed. Try again.",
    };
  }

  revalidatePath("/admin/settings");
  return { ok: true, data: undefined };
}

export async function sendCareNudge(input: {
  userId: string;
  postId?: string | null;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = careNudgeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the member and thought.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_send_nudge", {
    p_user_id: parsed.data.userId,
    p_post_id: parsed.data.postId ?? null,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAdmin();
  revalidatePath("/admin/care");
  return { ok: true, data: undefined };
}
