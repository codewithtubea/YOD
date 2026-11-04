import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  PRIVACY_FEATURES,
  PRIVACY_VISIBILITY_LABELS,
} from "@/lib/account/privacy";
import { requireActiveMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Privacy",
};

export default async function PrivacyPage() {
  await requireActiveMember();

  return (
    <div className="space-y-8">
      <div>
        <p className="type-caption font-semibold text-gold">Privacy</p>
        <h1 className="type-display mt-2 text-ink">Care, not surveillance.</h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-soft">
          The circle only needs enough to help us read, pray, and care for one
          another. Nothing here is public, indexed, or sold.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="grid gap-4 sm:grid-cols-3 lg:sticky lg:top-24 lg:grid-cols-1">
          <Card variant="gold" padding="sm">
            <p className="type-caption font-semibold text-gold">No rankings</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              No streaks, leaderboards, or public lists of who is quiet.
            </p>
          </Card>
          <Card variant="gold" padding="sm">
            <p className="type-caption font-semibold text-gold">
              No hidden feed
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Quiet reading and prayer stay quiet. Presence is aggregate only.
            </p>
          </Card>
          <Card variant="gold" padding="sm">
            <p className="type-caption font-semibold text-gold">
              Private by default
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Private prayers and admin-only notes never enter member views.
            </p>
          </Card>
        </div>

        <div className="space-y-8">
          <section aria-labelledby="what-is-shared" className="space-y-3">
            <h2 id="what-is-shared" className="type-heading text-ink">
              What is shared
            </h2>
            <div className="divide-y divide-line rounded-card border border-line bg-surface">
              {PRIVACY_FEATURES.map((feature) => (
                <div key={feature.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-ink">
                      {feature.label}
                    </h3>
                    <Badge
                      tone={feature.visibility === "circle" ? "sage" : "neutral"}
                    >
                      {PRIVACY_VISIBILITY_LABELS[feature.visibility]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="never-shared">
            <Card>
              <h2 id="never-shared" className="type-heading text-ink">
                Never shown to members
              </h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                <li>Your email address.</li>
                <li>Who said Amen or who marked a reading.</li>
                <li>The author of an anonymous prayer.</li>
                <li>Admin notes, reports, and resolved concerns.</li>
              </ul>
            </Card>
          </section>

          <section aria-labelledby="your-controls" className="space-y-3">
            <h2 id="your-controls" className="type-heading text-ink">
              Your controls
            </h2>
            <div className="flex flex-wrap gap-3 text-sm font-medium">
              <Link
                href="/account/export"
                className="inline-flex min-h-10 items-center rounded-soft bg-sage-soft px-4 text-ink transition hover:bg-sage/35"
              >
                Download your data
              </Link>
              <Link
                href="/settings/delete-account"
                className="inline-flex min-h-10 items-center rounded-soft bg-danger-soft px-4 text-danger transition hover:bg-danger/10"
              >
                Delete your account
              </Link>
              <Link
                href="/help/contact"
                className="inline-flex min-h-10 items-center rounded-soft border border-line px-4 text-ink transition hover:bg-surface-soft"
              >
                Ask about privacy
              </Link>
            </div>
            <p className="max-w-prose text-xs leading-relaxed text-ink-soft">
              Downloads include what the circle holds about you. Account
              deletion removes your profile, settings, memberships, and private
              activity, then lets you choose whether to keep your reflections
              without your name or erase them too.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
