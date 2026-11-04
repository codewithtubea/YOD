"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import {
  markAllNotificationsReadForm,
  openNotification,
} from "@/lib/study/actions";
import type { NotificationItem } from "@/lib/study/types";
import { RelativeTime } from "./relative-time";

function Bell({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

export function NotificationBell({
  unreadCount,
  items,
  available,
}: {
  unreadCount: number;
  items: NotificationItem[];
  available: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        onClick={() => setOpen(true)}
        className="relative"
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute right-2.5 top-2.5 size-2 rounded-full bg-gold ring-2 ring-canvas"
          />
        ) : null}
      </IconButton>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        description="Quiet updates from your circle."
      >
        {!available ? (
          <p className="rounded-soft border border-dashed border-line bg-surface-soft/60 px-4 py-6 text-sm leading-relaxed text-ink-soft">
            Notifications aren&apos;t set up yet. Apply the Phase 3 migration,
            then they will appear here.
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell size={24} />}
            title="All quiet for now"
            description="Replies, Amens, answered questions, and kind words will gather here."
          />
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const unread = !item.readAt;
              return (
                <form key={item.id} action={openNotification}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-soft border px-4 py-3 text-left transition hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      unread
                        ? "border-gold/30 bg-gold-soft/35"
                        : "border-line bg-surface",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        unread ? "bg-gold" : "bg-line",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-relaxed text-ink">
                        {item.message}
                      </span>
                      <span className="mt-1 block text-xs text-ink-soft">
                        <RelativeTime value={item.createdAt} />
                      </span>
                    </span>
                  </button>
                </form>
              );
            })}

            {unreadCount > 0 ? (
              <form action={markAllNotificationsReadForm} className="pt-2">
                <Button type="submit" variant="ghost" size="sm" className="w-full">
                  Mark all as read
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </Sheet>
    </>
  );
}
