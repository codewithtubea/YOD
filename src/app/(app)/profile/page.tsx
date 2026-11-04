import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileHeader } from "@/components/account/profile-header";
import { Card } from "@/components/ui/card";
import { getMyAccount, getMyContributions } from "@/lib/account/data";
import { requireActiveMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Your profile",
};

export default async function ProfilePage() {
  await requireActiveMember();
  const [result, contributions] = await Promise.all([
    getMyAccount(),
    getMyContributions(),
  ]);

  if (!result.available) {
    return (
      <Card>
        <h1 className="type-heading text-ink">Profile unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Apply the Phase 5B migration to load member profiles.
        </p>
      </Card>
    );
  }

  if (!result.account) redirect("/onboarding");
  const account = result.account;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/people"
          className="text-xs font-medium text-link underline-offset-4 hover:underline"
        >
          The circle
        </Link>
        <h1 className="type-display mt-2 text-ink">Your profile</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          This is how you appear to active members.
        </p>
      </div>

      <ProfileHeader account={account} />

      <Card variant="soft" padding="sm">
        <p className="type-caption font-semibold text-gold">Your contributions</p>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-ink-soft">Thoughts</dt>
            <dd className="mt-1 font-serif text-2xl text-ink">
              {contributions.thoughts}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Replies</dt>
            <dd className="mt-1 font-serif text-2xl text-ink">
              {contributions.replies}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Prayers shared</dt>
            <dd className="mt-1 font-serif text-2xl text-ink">
              {contributions.prayersShared}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          Counts include only what is still visible. Prayer details stay
          private; this is just how many you have shared.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="soft" padding="sm">
          <p className="type-caption font-semibold text-gold">Private to you</p>
          <p className="mt-2 break-all text-sm text-ink">{account.email}</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Other members never see your email address.
          </p>
        </Card>

        <Card variant="soft" padding="sm">
          <p className="type-caption font-semibold text-gold">Your choices</p>
          <p className="mt-2 text-sm text-ink">
            Manage display, data, and leaving the circle.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
            <Link
              href="/settings"
              className="text-link underline-offset-4 hover:underline"
            >
              Settings
            </Link>
            <Link
              href="/privacy"
              className="text-link underline-offset-4 hover:underline"
            >
              Privacy
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
