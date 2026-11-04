import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenText, HeartHandshake, Users } from "lucide-react";

import { LivingSky } from "@/components/motion/living-sky";
import { WaitingRoom } from "@/components/waiting/waiting-room";
import { signOut } from "@/lib/actions/sign-out";
import { getAuthContext } from "@/lib/auth";
import { getSkyPeriod } from "@/lib/sky";

export const metadata: Metadata = {
  title: "Waiting for approval",
  robots: { index: false, follow: false },
};

const CIRCLE = [
  {
    icon: BookOpenText,
    title: "One chapter at a time",
    body: "The daily ask is small on purpose. Read, reflect if you want, and leave the rest for another day.",
  },
  {
    icon: Users,
    title: "People who stay",
    body: "Community is not an audience. It is the ordinary faithfulness of showing up for one another, and being missed when you are not there.",
  },
  {
    icon: HeartHandshake,
    title: "Care, not surveillance",
    body: "There are no streaks, rankings, or public inactivity lists. The circle notices gently, and never keeps score.",
  },
];

export default async function WaitingPage() {
  const context = await getAuthContext();

  if (!context) redirect("/sign-in");
  if (!context.membership) redirect("/sign-in?error=profile");
  if (context.membership.status === "active") redirect("/today");
  if (context.membership.status !== "pending") {
    redirect("/sign-in?error=inactive");
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-canvas">
      <LivingSky period={getSkyPeriod()} contained className="opacity-70" />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-20 pt-6 sm:px-6 sm:pt-10">
        <header className="flex items-center justify-between gap-4 border-b border-line/80 pb-5">
          <Link
            href="/"
            className="font-serif text-lg tracking-tight text-ink"
            aria-label="YOD Circle home"
          >
            YOD <span className="text-gold">Circle</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-medium text-ink-soft transition hover:bg-surface-soft hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </header>

        <div className="pt-12 sm:pt-16">
          <p className="type-caption font-semibold text-gold">Waiting room</p>
          <h1 className="type-display mt-3 text-ink">
            You&apos;re almost in.
          </h1>
          <p className="type-body mt-5 max-w-lg text-ink-soft">
            Your account exists, but the circle is private. An admin will look at
            your request soon. Until then, here is a quiet place to wait.
          </p>
        </div>

        <div className="mt-10">
          <WaitingRoom displayName={context.membership.display_name} />
        </div>

        <section
          aria-labelledby="circle-heading"
          className="mt-14 border-t border-line/80 pt-12"
        >
          <p className="type-caption font-semibold text-gold">
            What you are being let into
          </p>
          <h2 id="circle-heading" className="type-title mt-3 text-ink">
            A circle is a place to belong, not a place to perform.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            YOD Circle exists so a small group of people can keep company with
            Scripture and with one another. We believe community matters because
            faith was never meant to be carried alone: we need people who will
            rejoice with us, sit with us in the heavy weeks, and remind us that
            we are still held.
          </p>

          <div className="mt-8 grid gap-5">
            {CIRCLE.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-sage-soft text-forest">
                    <Icon aria-hidden size={18} strokeWidth={1.5} />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-10 rounded-card border border-line bg-surface/70 px-5 py-4 text-sm leading-relaxed text-ink-soft">
            Once approved, you will begin with one chapter. Nothing else is
            required of you today.
          </p>
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line/80 pt-6 text-xs text-ink-soft">
          <p>Your request stays private. Only admins can see it.</p>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-10 font-medium text-link underline-offset-4 hover:underline"
            >
              Sign out for now
            </button>
          </form>
        </footer>
      </div>
    </main>
  );
}
