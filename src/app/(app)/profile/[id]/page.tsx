import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EncourageButton } from "@/components/check-in/encourage-button";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { getMemberProfile } from "@/lib/account/data";
import { requireActiveMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Member profile",
};

function joinedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireActiveMember();
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) notFound();

  const member = await getMemberProfile(parsed.data);
  if (!member) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/people"
        className="text-xs font-medium text-link underline-offset-4 hover:underline"
      >
        The circle
      </Link>

      <Card>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <Avatar
            name={member.displayName}
            src={member.avatarUrl}
            size="lg"
            className="size-20 text-xl"
          />
          <div className="min-w-0">
            <h1 className="type-display text-ink">{member.displayName}</h1>
            <p className="mt-1 text-xs text-ink-soft">
              In the circle since {joinedDate(member.joinedAt)}
            </p>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-soft">
              {member.bio || "No bio yet."}
            </p>
            {member.id === viewer.userId ? (
              <Link
                href="/profile"
                className="mt-4 inline-flex min-h-9 items-center text-xs font-medium text-link underline-offset-4 hover:underline"
              >
                Edit your profile
              </Link>
            ) : (
              <div className="mt-4">
                <EncourageButton
                  memberId={member.id}
                  memberName={member.displayName}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <p className="text-xs leading-relaxed text-ink-soft">
        Only shared profile details appear here. Email addresses, private
        prayers, and account activity are never shown.
      </p>
    </div>
  );
}
