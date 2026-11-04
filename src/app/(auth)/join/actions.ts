"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import {
  displayNameSchema,
  emailSchema,
  joinPasswordSchema,
} from "@/lib/validation/auth";

export type JoinResult =
  | { ok: true; needsConfirmation: boolean; message: string }
  | { ok: false; message: string };

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function join(input: {
  email: string;
  password: string;
  displayName: string;
  next?: string;
}): Promise<JoinResult> {
  const email = emailSchema.safeParse(input.email);
  const password = joinPasswordSchema.safeParse(input.password);
  const displayName = displayNameSchema.safeParse(input.displayName);

  if (!email.success) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!displayName.success) {
    return { ok: false, message: displayName.error.issues[0]?.message ?? "Add your name." };
  }
  if (!password.success) {
    return { ok: false, message: password.error.issues[0]?.message ?? "Choose a password." };
  }

  if (!readSupabaseEnv().ok) {
    return { ok: false, message: "Joining isn't configured yet. Ask the circle admin." };
  }

  const next = safeNextPath(input.next);
  const site = await origin();
  let destination = next;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        data: { display_name: displayName.data },
        emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}`,
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
