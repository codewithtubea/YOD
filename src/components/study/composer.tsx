"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PostAscend } from "@/components/motion/post-ascend";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createPost } from "@/lib/study/actions";

type ComposerProps = {
  planDate: string;
  catchingUp?: boolean;
  onOptimistic: (kind: "thought" | "question", body: string) => string;
  onRollback: (id: string) => void;
};

export function Composer({
  planDate,
  catchingUp,
  onOptimistic,
  onRollback,
}: ComposerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"thought" | "question">("thought");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ascending, setAscending] = useState(false);

  function resetAfterShare() {
    setAscending(false);
    setSubmitting(false);
    setOpen(false);
    setBody("");
    setKind("thought");
  }

  async function share() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    const optimisticId = onOptimistic(kind, trimmed);
    const result = await createPost({ planDate, kind, body: trimmed });

    if (!result.ok) {
      onRollback(optimisticId);
      setSubmitting(false);
      toast({
        title: "Your words are still here",
        description: result.message,
        tone: "danger",
        duration: 6500,
      });
      return;
    }

    setAscending(true);
    router.refresh();
    window.setTimeout(resetAfterShare, 1_400);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-card border border-line bg-surface px-5 py-4 text-left shadow-soft transition hover:border-sage/70 hover:bg-surface-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">
            {catchingUp ? "Catch up with a thought or question" : "Share a thought or question"}
          </span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            Keep it gentle. One tap opens the page.
          </span>
        </span>
      </button>

      <Sheet
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false);
        }}
        title={catchingUp ? "Catching up" : "Add to today"}
        description={
          catchingUp
            ? "This reading has passed, but the conversation is still open."
            : "A thought or a question. Both are welcome."
        }
      >
        <PostAscend active={ascending} onComplete={resetAfterShare}>
          <div className="space-y-5">
            <SegmentedControl
              label="What are you sharing?"
              value={kind}
              onChange={(value) => setKind(value as "thought" | "question")}
              options={[
                { id: "thought", label: "Thought" },
                { id: "question", label: "Question" },
              ]}
            />

            <Textarea
              label={kind === "question" ? "Your question" : "Your thought"}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              placeholder={
                kind === "question"
                  ? "What are you wondering about in this chapter?"
                  : "What stayed with you?"
              }
              hint="Visible to everyone in the circle."
              disabled={submitting || ascending}
            />

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={share}
                loading={submitting}
                disabled={!body.trim() || ascending}
              >
                {kind === "question" ? "Ask the circle" : "Share"}
              </Button>
            </div>
          </div>
        </PostAscend>
      </Sheet>
    </>
  );
}
