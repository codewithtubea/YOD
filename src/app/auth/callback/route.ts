import { NextResponse, type NextRequest } from "next/server";

import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

function noStoreRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  const signInWith = (params: string) =>
    noStoreRedirect(
      new URL(`/sign-in?${params}`, requestUrl.origin),
    );

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
  const otpType =
    type === "email" || type === "magiclink" || type === "signup"
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

    if ((membership as { status?: string }).status !== "active") {
      await supabase.auth.signOut();
      return signInWith("error=inactive");
    }

    return noStoreRedirect(new URL(next, requestUrl.origin));
  } catch {
    return signInWith("error=auth");
  }
}
