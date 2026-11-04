"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Candle } from "@/components/art/candle";
import { PostAscend } from "@/components/motion/post-ascend";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createPrayer } from "@/lib/prayer/actions";

type PrayerComposerProps = {
  onOptimistic: (body: string) => string;
  onRollback: (id: string) => void;
};

export function PrayerComposer({
  onOptimistic,
  onRollback,
}: PrayerComposerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ascending, setAscending] = useState(false);

  function resetAfterShare() {
    setAscending(false);
    setSubmitting(false);
    setOpen(false);
    setBody("");
  }

  async function share() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    const optimisticId = onOptimistic(trimmed);
    const result = await createPrayer({ body: trimmed });

    if (!result.ok) {
      onRollback(optimisticId);
      setSubmitting(false);
      toast({
        title: "Your prayer is still here",
        description: result.message,
        tone: "danger",
        duration: 6500,
      });
      return;
    }

    setAscending(true);
    router.refresh();
    window.setTimeout(resetAfterShare, 1400);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-card border border-line bg-surface px-5 py-4 text-left shadow-soft transition hover:border-sage/70 hover:bg-surface-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
          <Candle size={24} lit animated />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">
            Share a prayer
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
            Anonymous. No name or profile is shown.
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-lg text-ink-soft"
        >
          +
        </span>
      </button>

      <Sheet
        open={open}
        onClose={() => {
          if (!submitting && !ascending) setOpen(false);
        }}
        title="Share a prayer"
        description="No names or profiles are shown. Authorship is kept privately so you can manage your own prayer."
      >
        <PostAscend active={ascending} onComplete={resetAfterShare}>
          <div className="space-y-5">
            <Textarea
              label="What can we pray for?"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1200}
              placeholder="Lord, please…"
              hint="Please avoid sharing another person's private details."
              disabled={submitting || ascending}
            />

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={share}
                loading={submitting}
                disabled={!body.trim() || ascending}
              >
                Share prayer
              </Button>
            </div>
          </div>
        </PostAscend>
      </Sheet>
    </>
  );
}
