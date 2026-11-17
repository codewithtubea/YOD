"use server";

import { readSupabaseEnv } from "@/lib/env";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation/auth";

export type ForgotPasswordResult = {
  ok: boolean;
  message: string;
};

export async function requestPasswordReset(input: {
  email: string;
}): Promise<ForgotPasswordResult> {
  const parsed = emailSchema.safeParse(input.email);

  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (!readSupabaseEnv().ok) {
    return {
      ok: false,
      message: "Password reset isn't configured yet. Ask the circle admin.",
    };
  }

  const site = await getSiteUrl();

  if (!site.ok) {
    return {
      ok: false,
      message:
        "Reset links aren't configured for this deployment. Ask the circle admin to set the site URL.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${site.url}/auth/callback?recovery=1&next=/reset-password`,
    });

    if (error) {
      if (error.status === 429) {
        return {
          ok: false,
          message: "Too many attempts. Wait a few minutes and try again.",
        };
      }
      return {
        ok: false,
        message: "We couldn't send the reset email. Try again.",
      };
    }
  } catch {
    return {
      ok: false,
      message:
        "We couldn't reach the sign-in service. Check your connection and try again.",
    };
  }

  return {
    ok: true,
    message:
      "If that email has an account, a reset link is on its way. Check your inbox.",
  };
}
