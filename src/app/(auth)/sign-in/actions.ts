"use server";

import { redirect } from "next/navigation";

import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, passwordSchema } from "@/lib/validation/auth";

export type SignInResult = {
  ok: boolean;
  message: string;
};

const INVALID_MESSAGE = "Email or password is incorrect.";
const RATE_LIMIT_MESSAGE =
  "Too many attempts. Please wait a minute and try again.";
const NETWORK_MESSAGE =
  "We couldn't reach the sign-in service. Check your connection and try again.";
const CONFIG_MESSAGE =
  "Sign-in is not configured yet. Ask the circle admin to finish setup.";
const PROFILE_MESSAGE =
  "We couldn't find your membership. Contact the circle admin.";
const INACTIVE_MESSAGE = "Your access is paused. Contact the circle admin.";

function isRateLimit(error: { status?: number; code?: string } | null) {
  return (
    error?.status === 429 ||
    error?.code === "over_request_rate_limit" ||
    error?.code === "over_email_send_rate_limit"
  );
}

export async function signIn(input: {
  email: string;
  password: string;
  next?: string;
}): Promise<SignInResult> {
  const parsedEmail = emailSchema.safeParse(input.email);
  const parsedPassword = passwordSchema.safeParse(input.password);

  if (!parsedEmail.success) {
    return {
      ok: false,
      message:
        parsedEmail.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  if (!parsedPassword.success) {
    return {
      ok: false,
      message:
        parsedPassword.error.issues[0]?.message ?? "Enter your password.",
    };
  }

  if (!readSupabaseEnv().ok) {
    return { ok: false, message: CONFIG_MESSAGE };
  }

  const next = safeNextPath(input.next);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsedEmail.data,
      password: parsedPassword.data,
    });

    if (error) {
      if (isRateLimit(error)) {
        return { ok: false, message: RATE_LIMIT_MESSAGE };
      }

      // Do not reveal whether the address exists, is invited, or is paused.
      return { ok: false, message: INVALID_MESSAGE };
    }

    const { data: membership, error: membershipError } = await supabase
      .rpc("get_my_membership")
      .maybeSingle();

    if (membershipError) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message:
          membershipError.code === "PGRST202"
            ? CONFIG_MESSAGE
            : PROFILE_MESSAGE,
      };
    }

    if (!membership) {
      await supabase.auth.signOut();
      return { ok: false, message: PROFILE_MESSAGE };
    }

    if ((membership as { status?: string }).status === "pending") {
      redirect("/waiting");
    }

    if ((membership as { status?: string }).status !== "active") {
      await supabase.auth.signOut();
      return { ok: false, message: INACTIVE_MESSAGE };
    }
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }

  redirect(next);
}
