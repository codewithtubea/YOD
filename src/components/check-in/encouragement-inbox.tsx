"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { markEncouragementsRead } from "@/lib/check-in/actions";
import type { EncouragementView } from "@/lib/check-in/types";
import { cn } from "@/lib/cn";
import { RelativeTime } from "@/components/study/relative-time";

export function EncouragementInbox({
  encouragements,
  unreadCount,
  available,
}: {
  encouragements: EncouragementView[];
  unreadCount: number;
  available: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [marking, setMarking] = useState(false);

  async function markRead() {
    setMarking(true);
    const result = await markEncouragementsRead();
    setMarking(false);

    if (!result.ok) {
      toast({
        title: "Could not mark as read",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    router.refresh();
  }

  return (
    <section
      id="encouragements"
      aria-labelledby="encouragements-heading"
      className="scroll-mt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="type-caption font-semibold text-gold">Encouragement inbox</p>
          <h2
            id="encouragements-heading"
            className="mt-1 flex flex-wrap items-center gap-2 type-heading text-ink"
          >
            Kind words received
            {available && unreadCount > 0 ? (
              <Badge tone="gold">
                {unreadCount} unread
              </Badge>
            ) : null}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
            Private notes from other members. They are not shown to anyone else.
          </p>
        </div>
        {available && unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markRead}
            loading={marking}
          >
            Mark {unreadCount === 1 ? "it" : "all"} as read
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        {!available ? (
          <p className="rounded-card border border-dashed border-line bg-surface/55 px-5 py-6 text-sm leading-relaxed text-ink-soft">
            Encouragements will appear once the Phase 6 migration is applied.
          </p>
        ) : encouragements.length === 0 ? (
          <EmptyState
            icon={<Heart size={22} />}
            title="A quiet place for kind words"
            description="Encouragement is a short, private note. Only you will see notes sent to you, and only the person you encourage sees yours. When someone sends one, it will rest here."
          />
        ) : (
          <ul className="space-y-3">
            {encouragements.map((item) => {
              const unread = !item.readAt;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-card border px-4 py-4",
                    unread
                      ? "border-gold/30 bg-gold-soft/35"
                      : "border-line bg-surface",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={item.senderName}
                      src={item.senderAvatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/profile/${item.senderId}`}
                          className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {item.senderName}
                        </Link>
                        {unread ? (
                          <span className="rounded-full bg-gold px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-on-gold">
                            New
                          </span>
                        ) : null}
                        <span className="text-xs text-ink-soft">
                          <RelativeTime value={item.createdAt} />
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
