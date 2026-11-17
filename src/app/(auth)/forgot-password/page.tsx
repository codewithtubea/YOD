import type { Metadata } from "next";

import { AuthScreen } from "@/components/auth/auth-screen";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = firstValue(params.email)?.trim().toLowerCase() ?? "";

  return (
    <AuthScreen
      eyebrow="Account help"
      title="Forgot your password?"
      description="Enter the email you joined with. We'll send you a link to choose a new password."
    >
      <ForgotPasswordForm initialEmail={email} />
    </AuthScreen>
  );
}
