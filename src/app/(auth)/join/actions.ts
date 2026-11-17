"use server";

import { redirect } from "next/navigation";

import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import {
  displayNameSchema,
  emailSchema,
  joinPasswordSchema,
  birthdaySchema,
} from "@/lib/validation/auth";

export type JoinResult =
  | { ok: true; needsConfirmation: boolean; message: string }
  | { ok: false; message: string };

export async function join(input: {
  email: string;
  password: string;
  displayName: string;
  birthday?: string;
  next?: string;
}): Promise<JoinResult> {
  const email = emailSchema.safeParse(input.email);
  const password = joinPasswordSchema.safeParse(input.password);
  const displayName = displayNameSchema.safeParse(input.displayName);
  const birthdayResult = input.birthday
    ? birthdaySchema.safeParse(input.birthday)
    : { success: true as const, data: null };

  if (!email.success) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!displayName.success) {
    return { ok: false, message: displayName.error.issues[0]?.message ?? "Add your name." };
  }
  if (!password.success) {
    return { ok: false, message: password.error.issues[0]?.message ?? "Choose a password." };
  }
  if (!birthdayResult.success) {
    return {
      ok: false,
      message: birthdayResult.error.issues[0]?.message ?? "Choose a valid birthday.",
    };
  }

  if (!readSupabaseEnv().ok) {
    return { ok: false, message: "Joining isn't configured yet. Ask the circle admin." };
  }

  const next = safeNextPath(input.next);
  const site = await getSiteUrl();

  if (!site.ok) {
    return {
      ok: false,
      message:
        "Join links aren't configured for this deployment. Ask the circle admin to set the site URL.",
    };
  }

  let destination = next;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        data: { display_name: displayName.data, birthday: birthdayResult.data },
        emailRedirectTo: `${site.url}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      if (error.status === 429) {
        return {
          ok: false,
          message: "Too many attempts. Please wait a few minutes and try again.",
        };
      }
      return {
        ok: false,
        message:
          "We couldn't create your account. Use a different email address, or ask the circle admin for help.",
      };
    }

    if (!data.session) {
      return {
        ok: true,
        needsConfirmation: true,
        message:
          "Check your email to confirm your address, then sign in with the password you just chose. Your request will be waiting for an admin.",
      };
    }

    const { data: membership, error: membershipError } = await supabase
      .rpc("get_my_membership")
      .maybeSingle();

    if (membershipError || !membership) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message:
          "Your account was created, but the circle membership could not be read. Ask the circle admin.",
      };
    }

    const status = (membership as { status?: string }).status;

    if (status === "pending") {
      destination = "/waiting";
    } else if (status !== "active") {
      await supabase.auth.signOut();
      return { ok: false, message: "This account is not active yet." };
    }
  } catch {
    return {
      ok: false,
      message: "We couldn't reach the join service. Check your connection and try again.",
    };
  }

  redirect(destination);
}
