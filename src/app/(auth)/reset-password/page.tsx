import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthScreen } from "@/components/auth/auth-screen";
import { RESET_COOKIE } from "@/lib/password-reset";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = firstValue(params.token) ?? "";
  const cookieStore = await cookies();

  if (!token || cookieStore.get(RESET_COOKIE)?.value !== token) {
    redirect("/sign-in?error=link_invalid");
  }

  return (
    <AuthScreen
      eyebrow="Account help"
      title="Choose a new password"
      description="Only you can set a new password from this link. It expires shortly for your safety."
    >
      <ResetPasswordForm token={token} />
    </AuthScreen>
  );
}
