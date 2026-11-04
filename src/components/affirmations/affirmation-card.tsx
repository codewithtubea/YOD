"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Bookmark,
  BookmarkCheck,
  Quote,
  RotateCcw,
  Share2,
} from "lucide-react";

import { AffirmationVeil } from "@/components/motion/affirmation-veil";
import { AmenButton } from "@/components/motion/amen-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  toggleAffirmationAmen,
  toggleAffirmationFavorite,
} from "@/lib/affirmations/actions";
import type { AffirmationView } from "@/lib/affirmations/types";
import { useAffirmationReveal } from "@/lib/affirmations/use-reveal";
import { cn } from "@/lib/cn";

type AffirmationCardProps = {
  affirmation: AffirmationView;
  compact?: boolean;
  label?: string;
  className?: string;
};

export function AffirmationCard({
  affirmation,
  compact = false,
  label,
  className,
}: AffirmationCardProps) {
  const { toast } = useToast();
  const storageKey = `yod.affirmation.revealed.${affirmation.id}`;
  const [revealed, setRevealed] = useAffirmationReveal(storageKey);
  const [amen, setAmen] = useState({
    active: affirmation.viewerAmen,
    count: affirmation.amenCount,
  });
  const [saved, setSaved] = useState(affirmation.viewerSaved);
  const [amenPending, setAmenPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [sharePending, setSharePending] = useState(false);

  function reveal() {
    setRevealed(true);
  }

  function veilAgain() {
    setRevealed(false);
  }

  async function handleAmen(next: boolean) {
    if (amenPending) return;
    const previous = amen;
    setAmen({
      active: next,
      count: Math.max(0, previous.count + (next ? 1 : -1)),
    });
    setAmenPending(true);

    const result = await toggleAffirmationAmen({
      affirmationId: affirmation.id,
    });
    setAmenPending(false);

    if (!result.ok) {
      setAmen(previous);
      toast({
        title: "Amen not saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setAmen({ active: result.data.amen, count: result.data.amenCount });
  }

  async function handleSave() {
    if (savePending) return;
    const previous = saved;
    setSaved(!previous);
    setSavePending(true);

    const result = await toggleAffirmationFavorite({
      affirmationId: affirmation.id,
    });
    setSavePending(false);

    if (!result.ok) {
      setSaved(previous);
      toast({
        title: "Not saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setSaved(result.data.saved);
    toast({
      title: result.data.saved ? "Kept for later" : "Removed from saved",
      description: result.data.saved
        ? "You can find it again under Saved."
        : undefined,
    });
  }

  async function handleShare() {
    if (sharePending) return;
    setSharePending(true);

    const text = [
      affirmation.body,
      affirmation.scriptureRef ? `— ${affirmation.scriptureRef}` : null,
      "YOD Circle",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "A word for today", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "The words are ready to share." });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast({
          title: "Could not share",
          description: "Copy the words and share them in your own way.",
          tone: "danger",
        });
      }
    } finally {
      setSharePending(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <article className="overflow-hidden rounded-card border border-gold/25 bg-surface shadow-soft">
        <AffirmationVeil
          label={label}
          revealed={revealed}
          onReveal={reveal}
        >
          <div className="relative isolate">
            {affirmation.imageUrl ? (
              <>
                <Image
                  src={affirmation.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 42rem, 100vw"
                  className="object-cover opacity-20"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-canvas/70 to-surface"
                />
              </>
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(134,102,40,0.16),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(183,205,186,0.25),transparent_45%)]"
              />
            )}

            <div
              className={cn(
                "relative flex flex-col",
                compact ? "gap-5 p-5 sm:p-6" : "gap-6 p-6 sm:p-8",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="type-caption font-semibold text-gold">
                  A word to carry
                </p>
                <Quote
                  aria-hidden
                  size={20}
                  strokeWidth={1.4}
                  className="shrink-0 text-gold/60"
                />
              </div>

              <blockquote
                className={cn(
                  "font-serif text-ink",
                  compact
                    ? "text-2xl leading-[1.25] tracking-[-0.01em]"
                    : "type-scripture",
                )}
              >
                {affirmation.body}
              </blockquote>

              {affirmation.scriptureRef ? (
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
                  {affirmation.scriptureRef}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
                <AmenButton
                  active={amen.active}
                  count={amen.count}
                  disabled={amenPending}
                  onToggle={(next) => void handleAmen(next)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={saved}
                  loading={savePending}
                  onClick={() => void handleSave()}
                >
                  {saved ? (
                    <BookmarkCheck aria-hidden size={15} />
                  ) : (
                    <Bookmark aria-hidden size={15} />
                  )}
                  {saved ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={sharePending}
                  onClick={() => void handleShare()}
                >
                  <Share2 aria-hidden size={15} />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </AffirmationVeil>
      </article>

      {revealed ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={veilAgain}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-soft transition hover:bg-surface-soft hover:text-ink"
          >
            <RotateCcw aria-hidden size={13} />
            Veil again
          </button>
        </div>
      ) : null}
    </div>
  );
}
