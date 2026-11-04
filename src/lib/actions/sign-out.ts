"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function signOutEverywhere() {
  if (readSupabaseEnv().ok) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  }

  revalidatePath("/", "layout");
  redirect("/sign-in?signedOut=1");
}

export async function signOut() {
  if (readSupabaseEnv().ok) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      await supabase.auth.signOut({ scope: "local" });
    }
  }

  revalidatePath("/", "layout");
  redirect("/sign-in?signedOut=1");
}
