"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Candle } from "@/components/art/candle";
import { AnsweredReveal } from "@/components/motion/answered-reveal";
import { PrayedButton } from "@/components/motion/prayed-button";
import { RelativeTime } from "@/components/study/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  addPrayerUpdate,
  markPrayerAnswered,
  removePrayer,
  togglePrayerPrayed,
} from "@/lib/prayer/actions";
import type { PrayerView } from "@/lib/prayer/types";

function ActionMenu({ children }: { children: ReactNode }) {
  return (
    <details className="group relative">
      <summary
        aria-label="Prayer actions"
        className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-soft hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-4"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-soft border border-line bg-surface p-1.5 shadow-2xl shadow-forest/15">
        {children}
      </div>
    </details>
  );
}

function MenuButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center rounded-[calc(var(--radius-soft)-0.25rem)] px-3 text-left text-sm transition hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        danger ? "text-danger" : "text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function PrayerCard({ prayer }: { prayer: PrayerView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [local, setLocal] = useState(prayer);
  const [previousPrayer, setPreviousPrayer] = useState(prayer);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateBody, setUpdateBody] = useState("");
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [markingAnswered, setMarkingAnswered] = useState(false);
  const [removing, setRemoving] = useState(false);
  const removeTimer = useRef<number | null>(null);

  if (previousPrayer !== prayer) {
    setPreviousPrayer(prayer);
    setLocal(prayer);
  }

  useEffect(() => {
    return () => {
      if (removeTimer.current) window.clearTimeout(removeTimer.current);
    };
  }, []);

  const optimistic = local.id.startsWith("optimistic-");
  const isAuthor = local.viewerIsAuthor;
  const canAct = isAuthor && !optimistic;
  const isAnswered = local.status === "answered";

  async function handlePrayed(next: boolean) {
    if (optimistic) return;
    const previous = {
      prayedCount: local.prayedCount,
      viewerPrayed: local.viewerPrayed,
    };

    setLocal((current) => ({
      ...current,
      viewerPrayed: next,
      prayedCount: Math.max(0, current.prayedCount + (next ? 1 : -1)),
    }));

    const result = await togglePrayerPrayed({ prayerId: local.id });

    if (!result.ok) {
      setLocal((current) => ({ ...current, ...previous }));
      toast({
        title: "That wasn't saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setLocal((current) => ({
      ...current,
      viewerPrayed: result.data.prayed,
      prayedCount: result.data.prayedCount,
    }));
  }

  async function shareUpdate() {
    const trimmed = updateBody.trim();
    if (!trimmed || savingUpdate) return;

    setSavingUpdate(true);
    const result = await addPrayerUpdate({
      prayerId: local.id,
      body: trimmed,
    });
    setSavingUpdate(false);

    if (!result.ok) {
      toast({
        title: "Your update is still here",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setLocal((current) => ({
      ...current,
      updates: [
        ...current.updates,
        {
          id: result.data.id,
          body: trimmed,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setUpdateBody("");
    setUpdateOpen(false);
    router.refresh();
  }

  async function markAnswered() {
    if (markingAnswered || optimistic) return;
    setMarkingAnswered(true);
    const result = await markPrayerAnswered({ prayerId: local.id });
    setMarkingAnswered(false);

    if (!result.ok) {
      toast({
        title: "The prayer wasn't updated",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setLocal((current) => ({
      ...current,
      status: "answered",
      answeredAt: new Date().toISOString(),
    }));
    router.refresh();
  }

  function requestRemove() {
    if (!canAct || removing) return;
    setRemoving(true);

    toast({
      title: "Prayer removed",
      description: "You have a moment to undo.",
      tone: "neutral",
      duration: 8200,
      action: {
        label: "Undo",
        onClick: () => {
          if (removeTimer.current) {
            window.clearTimeout(removeTimer.current);
            removeTimer.current = null;
          }
          setRemoving(false);
        },
      },
    });

    removeTimer.current = window.setTimeout(async () => {
      removeTimer.current = null;
      const result = await removePrayer({ prayerId: local.id });
      if (!result.ok) {
        setRemoving(false);
        toast({
          title: "The prayer wasn't removed",
          description: result.message,
          tone: "danger",
        });
        return;
      }
      router.refresh();
    }, 7900);
  }

  if (removing) return null;

  return (
    <article aria-label="Anonymous prayer">
      <AnsweredReveal answered={isAnswered}>
        <div className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft/75 text-gold">
                <Candle size={24} lit={isAnswered} animated={isAnswered} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  Anonymous prayer
                </p>
                <p className="text-xs text-ink-soft">
                  <RelativeTime value={local.createdAt} />
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {optimistic ? (
                <Badge tone="neutral">Sending…</Badge>
              ) : (
                <>
                  {isAuthor ? <Badge tone="sage">Yours</Badge> : null}
                  {canAct ? (
                    <ActionMenu>
                      <MenuButton onClick={requestRemove} danger>
                        Remove prayer
                      </MenuButton>
                    </ActionMenu>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <p className="mt-4 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-ink">
            {local.body}
          </p>

          {local.updates.length > 0 ? (
            <div className="mt-5 space-y-3 border-t border-line/70 pt-4">
              <p className="type-caption font-semibold text-gold">Updates</p>
              {local.updates.map((update) => (
                <div
                  key={update.id}
                  className="rounded-soft bg-surface-soft/65 px-4 py-3"
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                    {update.body}
                  </p>
                  <p className="mt-1.5 text-[0.6875rem] text-ink-soft">
                    <RelativeTime value={update.createdAt} />
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <PrayedButton
              active={local.viewerPrayed}
              count={local.prayedCount}
              disabled={optimistic}
              onToggle={handlePrayed}
            />
            {canAct ? (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => setUpdateOpen(true)}
              >
                Add update
              </Button>
            ) : null}
            {canAct && !isAnswered ? (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={markAnswered}
                loading={markingAnswered}
              >
                Mark answered
              </Button>
            ) : null}
          </div>
        </div>
      </AnsweredReveal>

      <Sheet
        open={updateOpen}
        onClose={() => {
          if (!savingUpdate) setUpdateOpen(false);
        }}
        title="Add an update"
        description="Only you can add updates to this prayer. The circle will see it without your name."
      >
        <div className="space-y-5">
          <Textarea
            label="Your update"
            value={updateBody}
            onChange={(event) => setUpdateBody(event.target.value)}
            maxLength={600}
            placeholder="An answer, a next step, or a quiet word…"
            hint="Updates are visible to the circle."
            disabled={savingUpdate}
            className="min-h-28"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setUpdateOpen(false)}
              disabled={savingUpdate}
            >
              Cancel
            </Button>
            <Button
              onClick={shareUpdate}
              loading={savingUpdate}
              disabled={!updateBody.trim()}
            >
              Share update
            </Button>
          </div>
        </div>
      </Sheet>
    </article>
  );
}
