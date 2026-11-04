import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenText,
  Check,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";

import { LivingSky } from "@/components/motion/living-sky";
import { ButtonLink } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";
import { getSkyPeriod } from "@/lib/sky";

export const metadata: Metadata = {
  title: "A small circle, held in the hand of God",
  description:
    "YOD Circle is a private, approval-gated community for daily Scripture, honest reflection, prayer, and weekly care.",
};

const RHYTHM = [
  {
    icon: BookOpenText,
    label: "Today",
    title: "One chapter. One honest thought.",
    body: "A short reading, a reflection, and a question if you want to go deeper. No feed to fall behind.",
  },
  {
    icon: MessageCircle,
    label: "Prayer",
    title: "A place to be carried.",
    body: "Share a prayer with the circle, or keep it between you and God. Private prayer stays private.",
  },
  {
    icon: HeartHandshake,
    label: "Check-in",
    title: "Noticed, never measured.",
    body: "A weekly mood and an optional note. The circle sees only that someone checked in, never who is behind.",
  },
  {
    icon: Sun,
    label: "Affirmation",
    title: "A word to carry with you.",
    body: "A short affirmation with Scripture, saved for the days you need to return to it.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    body: "Your name, email, and a password. It takes less than a minute.",
  },
  {
    number: "02",
    title: "Wait for a gentle yes",
    body: "An admin reads every request. While you wait, you get a quiet waiting room with a little to explore.",
  },
  {
    number: "03",
    title: "Begin with Today",
    body: "Once approved, start with one chapter. That is the whole daily ask.",
  },
];

function YodMark() {
  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-square w-full max-w-md"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,var(--color-gold-soft),transparent_62%)] opacity-90" />
      <div className="absolute inset-3 rounded-full border border-gold/25" />
      <div className="absolute inset-10 rounded-full border border-sage/50" />
      <div className="absolute inset-[22%] rounded-full border border-line bg-surface/55 shadow-soft backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="block font-serif text-[clamp(5rem,20vw,9rem)] leading-[0.85] text-forest">
            י
          </span>
          <span className="mx-auto mt-5 block size-2 rounded-full bg-gold shadow-[0_0_0_6px_var(--color-gold-soft)]" />
        </div>
      </div>
      <span className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft backdrop-blur">
        the smallest letter
      </span>
      <Sparkles
        size={18}
        strokeWidth={1.25}
        className="absolute right-[17%] top-[19%] text-gold/70"
      />
    </div>
  );
}

export default async function Home() {
  const context = await getAuthContext();

  if (context?.membership?.status === "active") redirect("/today");
  if (context?.membership?.status === "pending") redirect("/waiting");
  if (context?.membership?.status === "deactivated") {
    redirect("/sign-in?error=inactive");
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-canvas">
      <LivingSky period={getSkyPeriod()} className="opacity-75" />

      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <Link
            href="/"
            className="font-serif text-lg tracking-tight text-ink"
            aria-label="YOD Circle home"
          >
            YOD <span className="text-gold">Circle</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account">
            <ButtonLink href="/sign-in" variant="ghost" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/join" size="sm">
              Ask to join
            </ButtonLink>
          </nav>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-20 lg:pb-28">
          <div className="max-w-xl">
            <p className="type-caption font-semibold text-gold">
              A private circle · one chapter a day
            </p>
            <h1 className="type-display mt-5 text-ink">
              Small enough to be known.
            </h1>
            <p className="type-body mt-6 max-w-lg text-ink-soft">
              YOD Circle is a quiet corner of the internet for a small Christian
              community: Scripture, honest reflection, prayer, and people who
              notice when you are away.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/join" size="lg" className="group">
                Ask to join the circle
                <ArrowRight
                  aria-hidden
                  size={17}
                  strokeWidth={1.75}
                  className="transition group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </ButtonLink>
              <ButtonLink href="/sign-in" variant="quiet" size="lg">
                I already have an account
              </ButtonLink>
            </div>

            <p className="mt-5 flex max-w-md items-start gap-2.5 text-xs leading-relaxed text-ink-soft">
              <ShieldCheck
                aria-hidden
                size={15}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-sage"
              />
              Registration is open from this link. Every request is read by an
              admin, so the circle stays private.
            </p>
          </div>

          <YodMark />
        </section>

        <section
          id="the-circle"
          className="border-y border-line/80 bg-surface/45"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
            <div>
              <p className="type-caption font-semibold text-gold">Why YOD</p>
              <h2 className="type-title mt-4 text-ink">
                The smallest letter, held by the hand of God.
              </h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-ink-soft">
              <p>
                <span className="font-serif text-xl text-ink">Yod</span> is the
                smallest letter in the Hebrew alphabet: a single point. Its name
                is linked to the hand, and it begins the Hebrew word for praise.
              </p>
              <p>
                We chose it because small things matter here. One chapter. One
                honest sentence. One prayer. One person choosing to stay. None
                of it needs to be impressive to be held.
              </p>
              <p className="border-l-2 border-gold/50 pl-4 text-ink">
                This is a circle, not an audience. There are no streaks, no
                rankings, and no public list of who has been quiet.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="type-caption font-semibold text-gold">
              A simple rhythm
            </p>
            <h2 className="type-title mt-4 text-ink">
              Four small doors, one gentle pace.
            </h2>
            <p className="type-body mt-4 text-ink-soft">
              You do not have to use all of it. The daily invitation is short on
              purpose.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            {RHYTHM.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="bg-surface/80 p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-sage-soft text-forest">
                      <Icon aria-hidden size={19} strokeWidth={1.5} />
                    </span>
                    <span className="type-label text-ink-soft">
                      {item.label}
                    </span>
                  </div>
                  <h3 className="type-heading mt-5 text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-line/80 bg-surface/45"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-20">
              <div>
                <p className="type-caption font-semibold text-gold">
                  How it works
                </p>
                <h2 className="type-title mt-4 text-ink">
                  A very simple way in.
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
                  You will not be dropped into a busy feed. First comes a
                  request, then a short wait, then one quiet chapter.
                </p>
                <ButtonLink href="/join" className="mt-7">
                  Start your request
                </ButtonLink>
              </div>

              <ol className="divide-y divide-line border-y border-line">
                {STEPS.map((step) => (
                  <li
                    key={step.number}
                    className="grid gap-3 py-6 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <span className="font-serif text-2xl leading-none text-gold/80 tabular">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="font-serif text-xl text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[linear-gradient(135deg,var(--color-sage-soft),var(--color-surface)_58%,var(--color-gold-soft))] px-6 py-14 text-center shadow-soft sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="absolute -right-20 -top-24 size-72 rounded-full border border-gold/15"
            />
            <div
              aria-hidden
              className="absolute -bottom-28 -left-16 size-80 rounded-full border border-sage/30"
            />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full border border-gold/30 bg-surface/70 text-gold">
                <Check aria-hidden size={19} strokeWidth={1.75} />
              </span>
              <h2 className="type-title mt-6 text-ink">
                Come as you are. That is the only requirement.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-soft">
                You do not need a perfect quiet time, a long prayer, or the right
                words. Begin with one chapter, or simply ask to be let in.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href="/join" size="lg">
                  Ask to join
                </ButtonLink>
                <ButtonLink href="/sign-in" variant="quiet" size="lg">
                  Sign in
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-line/80">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="font-serif text-sm text-ink">
              YOD <span className="text-gold">Circle</span>
            </p>
            <p className="max-w-md leading-relaxed">
              A private community for daily Scripture, prayer, and care. Not a
              public platform.
            </p>
            <Link
              href="/sign-in"
              className="font-medium text-link underline-offset-4 hover:underline"
            >
              Member sign in
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
