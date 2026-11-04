"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, EyeOff, MessageCircleQuestion, MessageSquare } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { hideContent, markQuestionAnswered } from "@/lib/admin/actions";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminQuestion } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

export function QuestionManager({
  questions,
  filter,
}: {
  questions: AdminQuestion[];
  filter: "open" | "answered" | "all";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [active, setActive] = useState<AdminQuestion | null>(null);
  const [mode, setMode] = useState<"answer" | "hide">("answer");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(question: AdminQuestion, nextMode: "answer" | "hide") {
    setActive(question);
    setMode(nextMode);
    setReason("");
    setError(null);
  }

  function close() {
    if (!saving) setActive(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    setSaving(true);
    setError(null);

    const result =
      mode === "answer"
        ? await markQuestionAnswered(active.id)
        : await hideContent({
            targetType: "post",
            targetId: active.id,
            reason,
          });

    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    toast({
      title: mode === "answer" ? "Question marked answered" : "Question hidden",
      description:
        mode === "answer"
          ? "The person who asked will see the answered marker."
          : "It is no longer visible to members. The audit log has the reason.",
    });
    setActive(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-line pb-3">
        {(["open", "answered", "all"] as const).map((value) => (
          <a
            key={value}
            href={`/admin/questions?filter=${value}`}
            aria-current={filter === value ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-soft px-3 text-sm capitalize transition",
              filter === value
                ? "bg-sage-soft font-medium text-hed"
                : "text-ink-soft hover:bg-surface-soft hover:text-ink",
            )}
          >
            {value}
          </a>
        ))}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={<MessageCircleQuestion size={24} />}
          title={filter === "open" ? "No open questions" : "No questions here"}
          description={
            filter === "open"
              ? "When someone asks the circle for help, it will wait here."
              : "No questions match this view."
          }
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {questions.map((question) => (
            <li key={question.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={question.status === "answered" ? "sage" : "gold"}>
                    {question.status}
                  </Badge>
                  <span className="text-xs text-ink-soft">
                    {formatAdminDate(question.planDate)} · asked by {question.authorName}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                  <MessageSquare aria-hidden size={13} />
                  {question.replyCount} {question.replyCount === 1 ? "reply" : "replies"}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-ink">
                {question.body}
              </p>

              {question.hiddenAt ? (
                <p className="mt-3 text-xs text-danger">Hidden from members</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/today/questions?date=${question.planDate}#post-${question.id}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-soft px-3 text-xs font-medium text-link transition hover:bg-surface-soft"
                >
                  <MessageSquare aria-hidden size={14} />
                  Open discussion
                </a>
                {question.status === "open" && !question.hiddenAt ? (
                  <Button variant="quiet" size="sm" onClick={() => open(question, "answer")}>
                    <CheckCircle2 aria-hidden size={15} />
                    Mark answered
                  </Button>
                ) : null}
                {!question.hiddenAt ? (
                  <Button variant="ghost" size="sm" onClick={() => open(question, "hide")}>
                    <EyeOff aria-hidden size={15} />
                    Hide
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminSection
        title="A quiet note"
        description="Questions are not a support queue. Answer when the circle can, and leave the rest with grace."
      >
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          Marking a question answered does not write an answer for you. Add the
          reply in the discussion first, then mark it answered so the person knows
          it was seen.
        </p>
      </AdminSection>

      <Sheet
        open={Boolean(active)}
        onClose={close}
        title={mode === "answer" ? "Mark this answered?" : "Hide this question?"}
        description={
          mode === "answer"
            ? "The question stays visible and the person who asked is notified. Add the reply in the discussion first."
            : "Members will stop seeing it immediately. The author is not notified."
        }
      >
        <form onSubmit={submit} className="space-y-5">
          {active ? (
            <blockquote className="border-l-2 border-sage/60 pl-4 text-sm leading-relaxed text-ink-soft">
              {active.body}
            </blockquote>
          ) : null}

          {mode === "hide" ? (
            <div className="space-y-2">
              <label htmlFor="question-hide-reason" className="block text-sm font-medium text-ink">
                Why is it being hidden?
              </label>
              <textarea
                id="question-hide-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                required
                maxLength={280}
                placeholder="A short, factual reason for the audit log."
                className="block min-h-28 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15"
              />
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant={mode === "hide" ? "danger" : "primary"} loading={saving}>
              {mode === "answer" ? "Mark answered" : "Hide question"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
