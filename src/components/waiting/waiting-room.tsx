"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

const TRIVIA = [
  {
    question: "Which book of the Bible opens with “In the beginning”?",
    answer: "Genesis.",
    note: "The beginning of the story, before there was anything to measure.",
  },
  {
    question: "Who said, “Here I am. Send me”?",
    answer: "Isaiah.",
    note: "A small yes to a large calling, in a year of great uncertainty.",
  },
  {
    question: "How many letters are in the Hebrew word “yod” — the letter itself?",
    answer: "One.",
    note: "It is a single point: the smallest letter, and the one Jesus said would not pass away.",
  },
];

export function WaitingRoom({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function checkAgain() {
    setChecked(false);
    startTransition(() => {
      router.refresh();
      setChecked(true);
    });
  }

  return (
    <div className="space-y-12">
      <section
        aria-labelledby="approval-status"
        className="rounded-card border border-gold/25 bg-surface/80 p-6 shadow-soft sm:p-8"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="type-label text-gold">Request pending</p>
            <h2 id="approval-status" className="type-heading mt-2 text-ink">
              We have your request, {displayName}.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              An admin will read it by name. When you are approved, refresh this
              page and you will walk straight into Today.
            </p>
          </div>
          <Button
            variant="quiet"
            onClick={checkAgain}
            loading={isPending}
            className="shrink-0"
          >
            {!isPending ? (
              <RefreshCw aria-hidden size={15} strokeWidth={1.75} />
            ) : null}
            Check again
          </Button>
        </div>
        {checked && !isPending ? (
          <p role="status" className="mt-5 text-sm text-ink-soft">
            Still waiting. Your place is held — there is nothing else to do.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="yod-meaning">
        <p className="type-caption font-semibold text-gold">A small thing</p>
        <h2 id="yod-meaning" className="type-title mt-3 text-ink">
          Why “YOD”?
        </h2>
        <div className="mt-5 grid gap-5 text-base leading-relaxed text-ink-soft sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-7">
          <span
            aria-hidden
            className="flex size-20 items-center justify-center rounded-full border border-gold/30 bg-gold-soft/60 font-serif text-5xl text-forest"
          >
            י
          </span>
          <div>
            <p>
              <span className="font-serif text-lg text-ink">Yod</span> is the
              smallest letter in the Hebrew alphabet: a single point. Its name is
              linked to the hand, and it begins the Hebrew word for praise.
            </p>
            <p className="mt-3">
              It reminds us that small things are not forgotten. One chapter. One
              prayer. One honest sentence. The hand of God is not too small for
              any of them.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="trivia-heading">
        <p className="type-caption font-semibold text-gold">
          Three gentle questions
        </p>
        <h2 id="trivia-heading" className="type-title mt-3 text-ink">
          A little Bible trivia.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
          No score, no timer. Tap a question when you want the answer.
        </p>

        <div className="mt-6 divide-y divide-line border-y border-line">
          {TRIVIA.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.question} className="py-1">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`trivia-answer-${index}`}
                  className="flex min-h-14 w-full items-center gap-4 py-4 text-left"
                >
                  <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-soft font-mono text-xs font-semibold text-ink-soft">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-ink">
                    {item.question}
                  </span>
                  <ChevronDown
                    aria-hidden
                    size={17}
                    strokeWidth={1.5}
                    className={`shrink-0 text-ink-soft transition-transform duration-quick ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div
                    id={`trivia-answer-${index}`}
                    className="pb-5 pl-11"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-forest">
                      <Check aria-hidden size={15} strokeWidth={2} />
                      {item.answer}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {item.note}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-l-2 border-gold/50 pl-5 sm:pl-6">
        <p className="type-label text-gold">That is all for now</p>
        <h2 className="type-heading mt-2 text-ink">
          This waiting room stops here. It is not a feed.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          There is nothing more to scroll, unlock, or keep up with. We would
          rather leave you with a little quiet than a lot of noise.
        </p>
      </section>
    </div>
  );
}
