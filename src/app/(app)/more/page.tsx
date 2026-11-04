import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  BookOpenText,
  ChevronRight,
  CircleHelp,
  HeartPulse,
  LogOut,
  MessageCircleQuestion,
  Settings2,
  Shield,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/actions/sign-out";
import { requireActiveMember } from "@/lib/auth";
import { getCheckInData } from "@/lib/check-in/data";
import {
  MEMBER_ADMIN_ITEM,
  MEMBER_MORE_GROUPS,
  type MemberMoreIcon,
  type MemberMoreItem,
} from "@/lib/features";

export const metadata: Metadata = {
  title: "More",
};

const MORE_ICONS: Record<MemberMoreIcon, LucideIcon> = {
  sermons: BookOpenText,
  questions: MessageCircleQuestion,
  archive: Archive,
  "check-in": HeartPulse,
  profile: UserRound,
  settings: Settings2,
  help: CircleHelp,
  privacy: Shield,
  admin: ShieldCheck,
};

function MoreLink({
  item,
  checkInDue,
  checkInDone,
}: {
  item: MemberMoreItem;
  checkInDue: boolean;
  checkInDone: boolean;
}) {
  const Icon = MORE_ICONS[item.icon];

  return (
    <Link
      href={item.href}
      className="group flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-soft/70 sm:px-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage-soft/70 text-forest">
        <Icon aria-hidden size={19} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{item.label}</span>
          {item.badge === "check-in" && checkInDue ? (
            <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-gold">
              Due
            </span>
          ) : null}
          {item.badge === "check-in" && checkInDone ? (
            <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-forest">
              Done this week
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
          {item.description}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        size={17}
        strokeWidth={1.5}
        className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-link"
      />
    </Link>
  );
}

export default async function MorePage() {
  const { membership } = await requireActiveMember();
  const checkIn = await getCheckInData();
  const checkInDue = checkIn.available && !checkIn.checkIn?.checkedIn;
  const checkInDone = checkIn.available && Boolean(checkIn.checkIn?.checkedIn);

  return (
    <div className="space-y-8">
      <header>
        <p className="type-caption font-semibold text-gold">More</p>
        <h1 className="type-display mt-2 text-ink">Everything else.</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
          The circle&apos;s other rooms, kept quiet and close.
        </p>
      </header>

      <div className="space-y-7">
        {MEMBER_MORE_GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`more-${group.id}`}>
            <h2
              id={`more-${group.id}`}
              className="type-label px-1 text-ink-soft"
            >
              {group.label}
            </h2>
            <Card padding="none" className="mt-2 overflow-hidden">
              <div className="divide-y divide-line">
                {group.items.map((item) => (
                  <MoreLink
                    key={item.id}
                    item={item}
                    checkInDue={checkInDue}
                    checkInDone={checkInDone}
                  />
                ))}
              </div>
            </Card>
          </section>
        ))}

        {membership.role === "admin" ? (
          <section aria-labelledby="more-admin">
            <h2 id="more-admin" className="type-label px-1 text-ink-soft">
              Admin (admins only)
            </h2>
            <Card padding="none" className="mt-2 overflow-hidden">
              <MoreLink
                item={MEMBER_ADMIN_ITEM}
                checkInDue={false}
                checkInDone={false}
              />
            </Card>
          </section>
        ) : null}

        <section aria-labelledby="more-account">
          <h2 id="more-account" className="type-label px-1 text-ink-soft">
            Account
          </h2>
          <Card padding="none" className="mt-2 overflow-hidden">
            <form action={signOut}>
              <button
                type="submit"
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-soft/70 sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink-soft">
                  <LogOut aria-hidden size={19} strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    Sign out
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                    Signed in as {membership.display_name}.
                  </span>
                </span>
              </button>
            </form>
          </Card>
        </section>
      </div>
    </div>
  );
}
