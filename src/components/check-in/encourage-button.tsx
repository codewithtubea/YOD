"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { sendEncouragement } from "@/lib/check-in/actions";

const textareaClass =
  "block min-h-28 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

export function EncourageButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);

    const result = await sendEncouragement({
      toUserId: memberId,
      body,
    });

    setSending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpen(false);
    setBody("");
    toast({
      title: "Note sent",
      description: `Your encouragement is waiting privately for ${memberName}.`,
      tone: "gold",
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="quiet"
        size="sm"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
      >
        <Heart aria-hidden size={15} />
        Encourage
      </Button>

      <Sheet
        open={open}
        onClose={() => {
          if (!sending) setOpen(false);
        }}
        title={`Encourage ${memberName}`}
        description="A short, kind word. Only this member will see it."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="encouragement-body" className="block text-sm font-medium text-ink">
              Your note
            </label>
            <textarea
              id="encouragement-body"
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 280))}
              placeholder="I am praying for you this week. You are not alone."
              className={textareaClass}
            />
            <p className="text-right text-xs text-ink-soft tabular">
              {body.trim().length}/280
            </p>
          </div>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={submit}
              loading={sending}
              disabled={body.trim().length === 0}
            >
              Send encouragement
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
