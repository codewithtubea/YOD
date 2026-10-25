import { cache } from "react";
import { redirect } from "next/navigation";

import { readSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/lib/types";

export type AuthContext = {
  userId: string;
  membership: Membership | null;
  error: "profile" | "config" | null;
};

/**
 * Verifies the session with Supabase Auth and reads membership from the
 * database. Cached per request so layout and page do not duplicate work.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  if (!readSupabaseEnv().ok) return null;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase.rpc("get_my_membership").maybeSingle();

  if (error) {
    return {
      userId: user.id,
      membership: null,
      error: error.code === "PGRST202" ? "config" : "profile",
    };
  }

  if (!data) {
    return { userId: user.id, membership: null, error: "profile" };
  }

  return {
    userId: user.id,
    membership: data as Membership,
    error: null,
  };
});

export async function requireActiveMember(): Promise<{
  userId: string;
  membership: Membership;
}> {
  const context = await getAuthContext();

  if (!context) redirect("/sign-in");
  if (!context.membership) {
    redirect(`/sign-in?error=${context.error ?? "profile"}`);
  }
  if (context.membership.status !== "active") {
    redirect("/sign-in?error=inactive");
  }

  return { userId: context.userId, membership: context.membership };
}
