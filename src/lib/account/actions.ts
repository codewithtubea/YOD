"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { getAuthContext } from "@/lib/auth";
import { isAllowedImageBytes } from "@/lib/account/image-signature";
import { AVATAR_BUCKET } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/study/types";
import {
  accountActionChallengeSchema,
  accountPasswordSchema,
  avatarPathSchema,
  contactMessageSchema,
  deleteAccountSchema,
  memberSettingsSchema,
  profileSchema,
  verificationCodeSchema,
} from "@/lib/validation/account";
import { getMemberProfile } from "@/lib/account/data";
import type { MemberProfile } from "@/lib/account/types";
import type { MemberSettingsInput } from "@/lib/validation/account";

type MemberGate =
  | { ok: true; userId: string }
  | { ok: false, message: string };

type DatabaseError = { code?: string; message?: string } | null;

async function memberGate(): Promise<MemberGate> {
  const context = await getAuthContext();

  if (!context) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }

  if (context.membership?.status !== "active") {
    return { ok: false, message: "This account is not active." };
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

function databaseMessage(error: DatabaseError) {
  if (!error) return "We couldn't save this just now. Try again.";
  if (error.code === "42501") return "You don't have permission to do that.";
  if (error.code === "23505") return "That was already saved.";
  if (error.code === "23514" || error.code === "23503") {
    return "That change didn't pass the circle's safety checks.";
  }
  if (error.code === "PGRST202" || error.code === "PGRST205") {
    return "The member database isn't ready yet. Apply the Phase 5B migration.";
  }
  if (
    error.message?.toLowerCase().includes("another administrator") ||
    error.message?.toLowerCase().includes("last active admin")
  ) {
    return "Add another administrator before leaving the circle.";
  }
  if (error.message?.toLowerCase().includes("code")) {
    return error.message;
  }
  if (error.message?.toLowerCase().includes("expired")) {
    return "That code has expired. Request a new one.";
  }
  if (error.message?.toLowerCase().includes("rate")) {
    return "That was too many attempts. Wait a little and try again.";
  }
  return "We couldn't do that just now. Try again.";
}

function refreshAccount() {
  revalidatePath("/", "layout");
  revalidatePath("/profile");
  revalidatePath("/people");
  revalidatePath("/settings");
  revalidatePath("/onboarding");
}

export async function saveProfile(input: {
  displayName: string;
  bio?: string;
  birthday?: string | null;
}): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your profile details.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_my_profile", {
    p_display_name: parsed.data.displayName,
    p_bio: parsed.data.bio,
    p_birthday: parsed.data.birthday,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAccount();
  return { ok: true, data: undefined };
}

export async function completeOnboarding(): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding");
  if (error) return { ok: false, message: databaseMessage(error) };

  refreshAccount();
  return { ok: true, data: undefined };
}

export async function getMemberCard(id: string): Promise<MemberProfile | null> {
  const gate = await memberGate();
  if (!gate.ok) return null;

  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getMemberProfile(id);
}

export async function setMyAvatar(path: string): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const parsed = avatarPathSchema.safeParse(path);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Choose a valid image.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data: file, error: downloadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .download(parsed.data);

  if (downloadError || !file) {
    return { ok: false, message: "That image was not uploaded. Try again." };
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!isAllowedImageBytes(header)) {
    await supabase.storage.from(AVATAR_BUCKET).remove([parsed.data]);
    return {
      ok: false,
      message: "Choose a real JPEG, PNG, or WebP image.",
    };
  }

  const { data, error } = await supabase.rpc("set_my_avatar", {
    p_path: parsed.data,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  const previous = typeof data === "string" ? data : null;
  if (previous && previous !== parsed.data) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  }

  refreshAccount();
  return { ok: true, data: undefined };
}

export async function clearMyAvatar(): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_my_avatar", {
    p_path: null,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  const previous = typeof data === "string" ? data : null;
  if (previous) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  }

  refreshAccount();
  return { ok: true, data: undefined };
}

export async function saveMemberSettings(
  input: MemberSettingsInput,
): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const parsed = memberSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your display choices.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const payload = {
    reduce_motion: parsed.data.reduceMotion,
    theme: parsed.data.theme,
    text_size: parsed.data.textSize,
    ...(parsed.data.notifyReplies === undefined
      ? {}
      : { notify_replies: parsed.data.notifyReplies }),
    ...(parsed.data.notifyAmens === undefined
      ? {}
      : { notify_amens: parsed.data.notifyAmens }),
    ...(parsed.data.notifyAnswered === undefined
      ? {}
      : { notify_answered: parsed.data.notifyAnswered }),
    ...(parsed.data.notifyEncouragements === undefined
      ? {}
      : { notify_encouragements: parsed.data.notifyEncouragements }),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("member_settings")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return { ok: false, message: databaseMessage(error) };

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const parsed = accountPasswordSchema.safeParse(input);
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

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    if (error.status === 429) {
      return {
        ok: false,
        message: "Too many attempts. Wait a moment and try again.",
      };
    }
    if (error.message.toLowerCase().includes("same password")) {
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

  return { ok: true, data: undefined };
}

export async function sendConcern(input: {
  category: "account" | "privacy" | "content" | "technical" | "other";
  subject: string;
  body: string;
}): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const parsed = contactMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your message.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_contact_message", {
    p_category: parsed.data.category,
    p_subject: parsed.data.subject,
    p_body: parsed.data.body,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  return { ok: true, data: undefined };
}

export async function requestAccountDeletionCode(): Promise<
  ActionResult<{ challengeId: string; email: string }>
> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }

  const { data, error } = await supabase
    .rpc("begin_account_action", { p_action: "delete_account" })
    .single<{ challenge_id: string }>();

  if (error || !data) {
    return { ok: false, message: databaseMessage(error) };
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  if (otpError) {
    if (otpError.status === 429) {
      return {
        ok: false,
        message: "Too many emails requested. Wait a little and try again.",
      };
    }
    return {
      ok: false,
      message:
        "We couldn't send the email. Ask an admin to check the email template.",
    };
  }

  return {
    ok: true,
    data: { challengeId: data.challenge_id, email: user.email },
  };
}

export async function verifyAccountDeletionCode(input: {
  challengeId: string;
  code: string;
}): Promise<ActionResult<{ proofId: string }>> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const challenge = accountActionChallengeSchema.safeParse(input.challengeId);
  const code = verificationCodeSchema.safeParse(input.code);

  if (!challenge.success || !code.success) {
    return {
      ok: false,
      message: "Enter the 6-digit code from the email.",
      fieldErrors: code.success ? undefined : fieldErrors(code.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code.data,
    type: "email",
  });

  if (verifyError) {
    if (verifyError.status === 429) {
      return {
        ok: false,
        message: "Too many attempts. Request a new code in a moment.",
      };
    }
    return {
      ok: false,
      message: "That code did not match. Check it or request a new one.",
      fieldErrors: { code: ["That code did not match."] },
    };
  }

  const { data, error } = await supabase.rpc("complete_account_action", {
    p_challenge_id: challenge.data,
  });

  if (error || typeof data !== "string") {
    return {
      ok: false,
      message: error?.message?.toLowerCase().includes("expired")
        ? "That code has expired. Request a new one."
        : databaseMessage(error),
    };
  }

  return { ok: true, data: { proofId: data } };
}

export async function deleteMyAccount(input: {
  proofId: string;
  keepContributions: boolean;
  confirmation: string;
}): Promise<ActionResult> {
  const gate = await memberGate();
  if (!gate.ok) return gate;

  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the confirmation.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account", {
    p_proof_id: parsed.data.proofId,
    p_mode: parsed.data.keepContributions
      ? "keep_contributions"
      : "delete_content",
    p_confirm: parsed.data.confirmation,
  });

  if (error) return { ok: false, message: databaseMessage(error) };

  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
