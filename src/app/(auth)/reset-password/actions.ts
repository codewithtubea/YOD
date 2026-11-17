"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { RESET_COOKIE } from "@/lib/password-reset";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validation/auth";

export type ResetPasswordResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function completePasswordReset(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<ResetPasswordResult> {
  const cookieStore = await cookies();

  if (
    !input.token ||
    cookieStore.get(RESET_COOKIE)?.value !== input.token
  ) {
    return {
      ok: false,
      message: "This reset link is no longer valid. Request a new one.",
    };
  }

  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return {
      ok: false,
      message: "Check the password fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Your reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.status === 429) {
      return {
        ok: false,
        message: "Too many attempts. Wait a moment and try again.",
      };
    }
    return {
      ok: false,
      message: "We couldn't save the new password. Try again.",
    };
  }

  cookieStore.delete(RESET_COOKIE);
  await supabase.auth.signOut();
  redirect("/sign-in?reset=1");
}
