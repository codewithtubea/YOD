import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LivingSky } from "@/components/motion/living-sky";
import { getAuthContext } from "@/lib/auth";
import { readSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirect";
import { getSkyPeriod } from "@/lib/sky";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join the circle",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = (first(params.email) ?? "").trim().toLowerCase();
  const next = safeNextPath(first(params.next));

  const env = readSupabaseEnv();
  const context = env.ok ? await getAuthContext() : null;
  if (context?.membership?.status === "active") redirect(next);
  if (context?.membership?.status === "pending") redirect("/waiting");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <LivingSky contained period={getSkyPeriod()} className="opacity-80" />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            YOD Circle
          </p>
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft/70">
            Registration
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">
            Ask to join the circle.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            Create your account with an email you can check. An admin will
            review your request before you enter, because this is a private
            circle.
          </p>
        </div>

        {!env.ok ? (
          <div className="rounded-3xl border border-line bg-surface/80 p-6 text-sm leading-relaxed text-ink-soft">
            Joining isn&apos;t configured yet. Ask the circle admin to finish setup.
          </div>
        ) : (
          <JoinForm initialEmail={email} next={next} />
        )}

        <p className="mx-auto mt-8 max-w-xs text-center text-xs leading-relaxed text-ink-soft/80">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-link underline-offset-4 hover:underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-link underline-offset-4 hover:underline">
            Back to the beginning
          </Link>
        </p>
      </div>
    </main>
  );
}
