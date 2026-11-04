import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getMemberDirectory } from "@/lib/account/data";
import { requireActiveMember } from "@/lib/auth";
import { getCheckInData } from "@/lib/check-in/data";
import { EncourageButton } from "@/components/check-in/encourage-button";
import { EncouragementInbox } from "@/components/check-in/encouragement-inbox";

export const metadata: Metadata = {
  title: "The circle",
};

export default async function PeoplePage() {
  const { userId } = await requireActiveMember();
  const [directory, checkIn] = await Promise.all([
    getMemberDirectory(),
    getCheckInData(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="type-caption font-semibold text-gold">The circle</p>
        <h1 className="type-display mt-2 text-ink">People here</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
          Names and photos shared by active members. Nothing else is listed.
        </p>
      </div>

      <EncouragementInbox
        encouragements={checkIn.encouragements}
        unreadCount={checkIn.unreadCount}
        available={checkIn.available}
      />

      {!directory.available ? (
        <Card>
          <h2 className="type-heading text-ink">The directory is not ready.</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Apply the Phase 5B migration, then reload this page.
          </p>
        </Card>
      ) : directory.members.length === 0 ? (
        <EmptyState
          title="No profiles yet"
          description="Once members set up their profiles, they will appear here."
        />
      ) : (
        <div id="directory" className="grid scroll-mt-24 gap-3 sm:grid-cols-2">
          {directory.members.map((member) => (
            <Card
              key={member.id}
              variant="soft"
              padding="sm"
              className="flex h-full flex-col"
            >
              <Link
                href={`/profile/${member.id}`}
                className="group flex flex-1 items-center gap-3"
              >
                <Avatar
                  name={member.displayName}
                  src={member.avatarUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink group-hover:text-link">
                    {member.displayName}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                    {member.bio || "No bio yet."}
                  </p>
                </div>
              </Link>
              {member.id !== userId ? (
                <div className="mt-3 border-t border-line/70 pt-2">
                  <EncourageButton
                    memberId={member.id}
                    memberName={member.displayName}
                  />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
