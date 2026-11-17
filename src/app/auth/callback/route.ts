import { NextResponse, type NextRequest } from "next/server";

import { readSupabaseEnv } from "@/lib/env";
import { RESET_COOKIE, RESET_COOKIE_MAX_AGE } from "@/lib/password-reset";
import { safeNextPath } from "@/lib/redirect";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

function noStoreRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const site = await getSiteUrl();
  const origin = site.ok ? site.url : requestUrl.origin;
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  const signInWith = (params: string) =>
    noStoreRedirect(new URL(`/sign-in?${params}`, origin));

  const errorCode =
    requestUrl.searchParams.get("error_code") ??
    requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (errorCode || errorDescription) {
    return signInWith(
      errorCode === "otp_expired" ? "error=link_expired" : "error=link_invalid",
    );
  }

  if (!readSupabaseEnv().ok) {
    return signInWith("error=config");
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const isRecovery =
    type === "recovery" || requestUrl.searchParams.get("recovery") === "1";
  const otpType =
    type === "email" ||
    type === "magiclink" ||
    type === "signup" ||
    type === "recovery"
      ? type
      : null;

  if (!code && !tokenHash) {
    return signInWith("error=link_invalid");
  }

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        const message = error.message.toLowerCase();
        return signInWith(
          message.includes("verifier") ? "error=link_browser" : "error=link_invalid",
        );
      }
    } else if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });

      if (error) {
        return signInWith(
          error.code === "otp_expired"
            ? "error=link_expired"
            : "error=link_invalid",
        );
      }
    } else {
      return signInWith("error=link_invalid");
    }

    if (isRecovery) {
      const resetToken = crypto.randomUUID();
      const resetUrl = new URL("/reset-password", origin);
      resetUrl.searchParams.set("token", resetToken);
      const response = noStoreRedirect(resetUrl);
      response.cookies.set(RESET_COOKIE, resetToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: RESET_COOKIE_MAX_AGE,
      });
      return response;
    }

    const { data: membership, error: membershipError } = await supabase
      .rpc("get_my_membership")
      .maybeSingle();

    if (membershipError) {
      return signInWith(
        membershipError.code === "PGRST202"
          ? "error=config"
          : "error=auth",
      );
    }

    if (!membership) {
      await supabase.auth.signOut();
      return signInWith("error=profile");
    }

    const status = (membership as { status?: string }).status;

    if (status === "pending") {
      return noStoreRedirect(new URL("/waiting", origin));
    }

    if (status !== "active") {
      await supabase.auth.signOut();
      return signInWith("error=inactive");
    }

    return noStoreRedirect(new URL(next, origin));
  } catch {
    return signInWith("error=auth");
  }
}
