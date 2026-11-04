import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PREVIEW_USER_ID, requireActiveMember } from "@/lib/auth";
import { getSkyPeriod } from "@/lib/sky";
import { AccountMenu } from "@/components/account/account-menu";
import { MemberPreferencesSync } from "@/components/account/member-preferences-sync";
import { LivingSky } from "@/components/motion/living-sky";
import { PrimaryNav } from "@/components/nav/primary-nav";
import { PreferencesMenu } from "@/components/ui/preferences-menu";
import { NotificationBell } from "@/components/study/notification-bell";
import { getMyAccount, getMemberSettings } from "@/lib/account/data";
import { getCheckInData } from "@/lib/check-in/data";
import { getNotificationsData } from "@/lib/study/data";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId, membership } = await requireActiveMember();
  const [notifications, accountResult, settings, checkIn] = await Promise.all([
    getNotificationsData(userId),
    getMyAccount(),
    getMemberSettings(),
    getCheckInData(),
  ]);

  const checkInDue = checkIn.available && !checkIn.checkIn?.checkedIn;

  if (accountResult.account && !accountResult.account.onboardedAt) {
    redirect("/onboarding");
  }

  const displayName =
    accountResult.account?.displayName ?? membership.display_name;

  return (
    <div className="relative min-h-dvh bg-canvas">
      <LivingSky period={getSkyPeriod()} className="z-0 opacity-60" />
      <MemberPreferencesSync settings={settings} />

      <div className="relative z-10">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:outline-2 focus:outline-focus"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              href="/today"
              className="shrink-0 font-serif text-lg tracking-tight text-ink"
            >
              YOD <span className="text-gold">Circle</span>
            </Link>

            <div className="mx-4 hidden flex-1 justify-center md:flex">
              <PrimaryNav
                variant="top"
                encouragementUnread={checkIn.unreadCount}
                attention={checkInDue}
              />
            </div>

            <div className="flex items-center gap-1">
              <NotificationBell
                available={notifications.available}
                unreadCount={notifications.unreadCount}
                items={notifications.items}
              />
              <PreferencesMenu />
              <AccountMenu
                displayName={displayName}
                avatarUrl={accountResult.account?.avatarUrl ?? null}
                isAdmin={membership.role === "admin"}
              />
            </div>
          </div>
        </header>

        {userId === PREVIEW_USER_ID ? (
          <div className="border-b border-gold/25 bg-gold-soft/45 px-4 py-2 text-center text-xs leading-relaxed text-ink-soft">
            Preview mode: the database is not connected. Apply the migrations
            and sign in for real writes.
          </div>
        ) : null}

        <main
          id="main"
          className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8 sm:px-6 sm:pt-12 md:pb-20"
        >
          {children}
        </main>

        <PrimaryNav
          variant="bottom"
          encouragementUnread={checkIn.unreadCount}
          attention={checkInDue}
        />
      </div>
    </div>
  );
}
