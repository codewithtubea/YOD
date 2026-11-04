"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Anchor, CloudRain, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { saveCheckIn } from "@/lib/check-in/actions";
import { CHECK_IN_MOOD_OPTIONS } from "@/lib/check-in/moods";
import type { CheckInView } from "@/lib/check-in/types";
import { cn } from "@/lib/cn";
import type { CheckInMood } from "@/lib/validation/check-in";

const MOOD_ICONS = {
  grateful: Sun,
  steady: Anchor,
  heavy: CloudRain,
  resting: Moon,
} satisfies Record<CheckInMood, typeof Sun>;

const textareaClass =
  "block min-h-24 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

export function CheckInPanel({
  checkIn,
}: {
  checkIn: CheckInView | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [mood, setMood] = useState<CheckInMood | null>(checkIn?.mood ?? null);
  const [note, setNote] = useState(checkIn?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(checkIn?.checkedIn));

  async function submit() {
    if (!mood) {
      setError("Choose how this week feels first.");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await saveCheckIn({ mood, note });

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSaved(true);
    toast({
      title: saved ? "Check-in updated" : "Check-in saved",
      description: "Thank you for letting the circle hold this week with you.",
      tone: "gold",
    });
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="type-caption font-semibold text-gold">This week</p>
          <h2 className="type-heading mt-1 text-ink">How are you, really?</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
            One small honest word is enough. Admins see this so they can care
            for you; other members only see a total count.
          </p>
        </div>
        {saved ? (
          <span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-forest dark:text-ink">
            Saved this week
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {CHECK_IN_MOOD_OPTIONS.map((option) => {
          const Icon = MOOD_ICONS[option.id];
          const active = mood === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setMood(option.id);
                setError(null);
              }}
              className={cn(
                "flex min-h-20 cursor-pointer items-start gap-3 rounded-soft border px-4 py-3 text-left transition",
                active
                  ? "border-gold/50 bg-gold-soft/50"
                  : "border-line bg-surface hover:bg-surface-soft",
              )}
            >
              <Icon
                aria-hidden
                size={20}
                strokeWidth={1.5}
                className={cn(
                  "mt-0.5 shrink-0",
                  active ? "text-gold" : "text-ink-soft",
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-2">
        <label
          htmlFor="check-in-note"
          className="block text-sm font-medium text-ink"
        >
          Anything you want the admins to know?{" "}
          <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <textarea
          id="check-in-note"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 280))}
          placeholder="A sentence is plenty. This is not shared with the circle."
          className={textareaClass}
        />
        <p className="text-right text-xs text-ink-soft tabular">
          {note.trim().length}/280
        </p>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={submit}
          loading={saving}
          disabled={!mood}
        >
          {saved ? "Update my check-in" : "Save my check-in"}
        </Button>
        <p className="text-xs leading-relaxed text-ink-soft">
          You can change this until the week ends.
        </p>
      </div>
    </Card>
  );
}
