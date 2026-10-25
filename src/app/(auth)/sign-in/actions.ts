"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import { codeSchema, emailSchema } from "@/lib/validation/auth";

export type RequestCodeResult = {
  ok: boolean;
  message: string;
  retryAfter?: number;
};

export type VerifyCodeResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

const NEUTRAL_MESSAGE =
  "If you're on the invite list, a message is on its way.";
const RATE_LIMIT_MESSAGE =
  "Too many attempts. Please wait a minute and try again.";
const NETWORK_MESSAGE =
  "We couldn't reach the sign-in service. Check your connection and try again.";
const CONFIG_MESSAGE =
  "Sign-in is not configured yet. Ask the circle admin to finish setup.";

async function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? null;

  if (!host) throw new Error("Unable to determine site origin.");

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const protocol =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${protocol}://${host}`;
}

function isRateLimit(error: { status?: number; code?: string } | null) {
  return (
    error?.status === 429 ||
    error?.code === "over_request_rate_limit" ||
    error?.code === "over_email_send_rate_limit"
  );
}

export async function requestCode(input: {
  email: string;
  next?: string;
}): Promise<RequestCodeResult> {
  const parsedEmail = emailSchema.safeParse(input.email);

  if (!parsedEmail.success) {
    return {
      ok: false,
      message:
        parsedEmail.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  if (!readSupabaseEnv().ok) {
    return { ok: false, message: CONFIG_MESSAGE };
  }

  const next = safeNextPath(input.next);

  try {
    const supabase = await createClient();
    const origin = await getSiteOrigin();

    const { error } = await supabase.auth.signInWithOtp({
      email: parsedEmail.data,
      options: {
        // Deliberate: the database trigger rejects non-invited emails. The UI
        // always returns the same neutral message, so this is not an oracle.
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (isRateLimit(error)) {
      return {
        ok: false,
        message: RATE_LIMIT_MESSAGE,
        retryAfter: 60,
      };
    }

    // Do not reveal whether an address is invited, whether Supabase rejected
    // the signup trigger, or whether the email already exists.
    return { ok: true, message: NEUTRAL_MESSAGE };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}

export async function verifyCode(input: {
  email: string;
  token: string;
  next?: string;
}): Promise<VerifyCodeResult> {
  const parsedEmail = emailSchema.safeParse(input.email);
  const parsedCode = codeSchema.safeParse(input.token);

  if (!parsedEmail.success) {
    return {
      ok: false,
      message:
        parsedEmail.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  if (!parsedCode.success) {
    return {
      ok: false,
      message:
        parsedCode.error.issues[0]?.message ??
        "Enter the 6-digit code from your email.",
    };
  }

  if (!readSupabaseEnv().ok) {
    return { ok: false, message: CONFIG_MESSAGE };
  }

  const next = safeNextPath(input.next);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: parsedEmail.data,
      token: parsedCode.data,
      type: "email",
    });

    if (error) {
      if (isRateLimit(error)) {
        return { ok: false, message: RATE_LIMIT_MESSAGE };
      }

      if (error.code === "otp_expired") {
        return {
          ok: false,
          message: "That code has expired. Request a new one.",
        };
      }

      if (error.code === "otp_disabled") {
        return {
          ok: false,
          message: "Email code sign-in is disabled. Ask the circle admin.",
        };
      }

      if (error.status && error.status >= 500) {
        return {
          ok: false,
          message:
            "We couldn't complete sign-in. Please try again, or contact the circle admin.",
        };
      }

      return {
        ok: false,
        message: "That code is incorrect or has expired. Please check it.",
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
          membershipError?.code === "PGRST202"
            ? CONFIG_MESSAGE
            : "Your account isn't fully set up. Contact the circle admin.",
      };
    }

    if ((membership as { status?: string }).status !== "active") {
      await supabase.auth.signOut();
      return {
        ok: false,
        message: "Your access is paused. Contact the circle admin.",
      };
    }

    revalidatePath("/", "layout");
    return { ok: true, redirectTo: next };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}
