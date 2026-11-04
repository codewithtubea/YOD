import type { Metadata } from "next";
import Link from "next/link";

import { getQuestionsData } from "@/lib/study/data";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OpenBook } from "@/components/art/open-book";
import { RelativeTime } from "@/components/study/relative-time";
import { StudyTabs } from "@/components/study/study-tabs";
import type { QuestionItem } from "@/lib/study/types";

export const metadata: Metadata = {
  title: "Questions",
};

function QuestionRow({ question }: { question: QuestionItem }) {
  return (
    <Link
      href={`/today/thread/${question.id}`}
      className="group block rounded-card border border-line bg-surface p-5 transition hover:border-sage/60 hover:bg-surface-soft/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="mb-3 flex items-center gap-3">
        <Avatar
          name={question.author.displayName}
          src={question.author.avatarUrl}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            {question.author.displayName}
          </p>
          <p className="text-xs text-ink-soft">
            <RelativeTime value={question.createdAt} />
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {question.status === "answered" ? (
            <Badge tone="gold">Answered</Badge>
          ) : null}
          <span className="text-xs text-ink-soft">
            {question.replyCount} {question.replyCount === 1 ? "reply" : "replies"}
          </span>
        </div>
      </div>

      <p className="line-clamp-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">
        {question.body}
      </p>

      <p className="mt-3 text-xs text-ink-soft">
        {question.planReference} ·{" "}
        <span className="text-link underline-offset-4 group-hover:underline">
          Open conversation
        </span>
      </p>
    </Link>
  );
}

export default async function QuestionsPage() {
  const [open, answered] = await Promise.all([
    getQuestionsData("open"),
    getQuestionsData("answered"),
  ]);
  const available = open.available || answered.available;
  const total = open.items.length + answered.items.length;

  return (
    <div className="space-y-7">
      <StudyTabs />

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Ask, and keep asking
        </p>
        <h1 className="type-title text-ink">Questions</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
          Honest questions belong here. Share one from Today, and the circle can
          reply gently.
        </p>
      </header>

      {!available ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          title="Questions aren't set up yet"
          description="Apply the Phase 3 migration to open the circle's questions."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          eyebrow="Still wondering"
          title="No questions yet"
          description="Ask one from today's reading. There's no pressure to have the answer first."
        />
      ) : (
        <div className="space-y-7">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="type-subtitle text-ink">Open</h2>
              <span className="text-xs text-ink-soft">{open.items.length}</span>
            </div>
            {open.items.length === 0 ? (
              <p className="rounded-soft border border-dashed border-line px-4 py-5 text-sm leading-relaxed text-ink-soft">
                No open questions right now.
              </p>
            ) : (
              <div className="space-y-3">
                {open.items.map((question) => (
                  <QuestionRow key={question.id} question={question} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="type-subtitle text-ink">Answered</h2>
              <span className="text-xs text-ink-soft">
                {answered.items.length}
              </span>
            </div>
            {answered.items.length === 0 ? (
              <p className="rounded-soft border border-dashed border-line px-4 py-5 text-sm leading-relaxed text-ink-soft">
                Answered questions will gather here.
              </p>
            ) : (
              <div className="space-y-3">
                {answered.items.map((question) => (
                  <QuestionRow key={question.id} question={question} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
