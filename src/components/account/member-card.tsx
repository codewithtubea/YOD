"use client";

import { useId, useState, type ReactNode } from "react";

import { getMemberCard } from "@/lib/account/actions";
import type { MemberProfile } from "@/lib/account/types";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";

function joinedMonth(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function MemberCard({
  memberId,
  name,
  className,
  children,
}: {
  memberId: string | null;
  name: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const titleId = useId();

  if (!memberId) {
    return <div className={cn("flex min-w-0 items-center", className)}>{children}</div>;
  }

  async function openCard() {
    setOpen(true);
    if (member || loading) return;
    setLoading(true);
    const result = await getMemberCard(memberId as string);
    setLoading(false);
    setMember(result);
  }

  return (
    <>
      <button
        type="button"
        onClick={openCard}
        aria-label={`Open ${name}'s member card`}
        aria-haspopup="dialog"
        className={cn(
          "flex min-w-0 items-center rounded-soft text-left transition hover:bg-surface-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          className,
        )}
      >
        {children}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Member card"
        description="A little about who you are reading with."
      >
        <div className="space-y-5">
          {loading ? (
            <p className="text-sm text-ink-soft">Opening…</p>
          ) : member ? (
            <>
              <div className="flex items-start gap-4">
                <Avatar
                  name={member.displayName}
                  src={member.avatarUrl}
                  size="lg"
                  className="size-16 text-lg"
                />
                <div className="min-w-0">
                  <h2 id={titleId} className="font-serif text-2xl text-ink">
                    {member.displayName}
                  </h2>
                  <p className="mt-1 text-xs text-ink-soft">
                    In the circle since {joinedMonth(member.joinedAt)}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-soft">
                {member.bio || "No bio yet."}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink-soft">
              This member&apos;s card is not available right now.
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
