import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireActiveMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Help",
};

const QUESTIONS = [
  {
    question: "How do I read today's chapter?",
    answer:
      "Open Today. The reading is already chosen for the circle's timezone. Tap the passage to open it in the Bible source, and mark it read when you are finished. The circle only sees a total count.",
  },
  {
    question: "How do I share a thought or ask a question?",
    answer:
      "On Today, write in the composer and choose Thought or Question. A question can be marked answered when someone gives the answer you were looking for. You can edit or delete your own words from the menu on the post.",
  },
  {
    question: "What does Amen mean?",
    answer:
      "Amen is a quiet way to agree with someone's reflection or prayer. The circle shows only a total count. No member can see who said Amen.",
  },
  {
    question: "How do I pray or say Amen to a prayer?",
    answer:
      "Open Prayer and write a request. It appears without your name. You can still add an update or mark your own prayer answered. Tap I prayed on someone else's prayer to hold it with them.",
  },
  {
    question: "How do I change my photo or name?",
    answer:
      "Open your profile from the account menu. You can add a square photo, change your name, and write a short bio. Changes appear across the circle after saving.",
  },
  {
    question: "What does the circle see about me?",
    answer:
      "Active members see your name, photo, bio, reflections, replies, and anonymous prayers. They never see your email, who said Amen, who marked a reading, your check-in answer, or private messages to admins.",
  },
  {
    question: "Can I delete something I wrote?",
    answer:
      "Yes. Open your reflection or reply and use the menu to delete it. Deleted content is soft-deleted immediately and removed from member views.",
  },
  {
    question: "What is the weekly check-in?",
    answer:
      "Open Check-in and choose one honest word for how the week feels, with an optional private note. Admins see it so they can care for you. Other members only see a total count of who checked in, never your answer or note. There are no streaks or rankings.",
  },
  {
    question: "How do encouragement notes work?",
    answer:
      "Open the circle, choose a member, and tap Encourage. Your short note is private: only that member sees it, and their name is the only identity shown. You can switch encouragement notices off in Settings, Notifications.",
  },
  {
    question: "How do notifications work?",
    answer:
      "Replies, Amens, answered questions, and encouragement notes appear in the bell inside the circle. You can switch each kind off in Settings, Notifications. There are no email digests.",
  },
  {
    question: "How do I add the circle to my home screen?",
    answer:
      "On iPhone, use Share then Add to Home Screen in Safari. On Android, open the browser menu and choose Add to Home screen. In WhatsApp, first choose Open in browser.",
  },
  {
    question: "How do I sign in?",
    answer:
      "Use the email address and password for your account. Anyone can ask to join at the landing page; an admin approves each new account before it can enter the circle. If you cannot sign in or are still waiting, send a message to the admins from Contact.",
  },
  {
    question: "How do I leave the circle?",
    answer:
      "Open Settings, then Delete your account. You will verify your email with a one-time code. You can keep your reflections without your name or erase them.",
  },
];

export default async function HelpPage() {
  await requireActiveMember();

  return (
    <div className="space-y-8">
      <div>
        <p className="type-caption font-semibold text-gold">Help</p>
        <h1 className="type-display mt-2 text-ink">A quiet guide.</h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-soft">
          Everything here takes less than ten seconds. Here are the answers we
          reach for most.
        </p>
        <Link
          href="/today?tour=1"
          className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:border-sage"
        >
          Replay the four-step welcome guide
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="space-y-3">
        {QUESTIONS.map((item) => (
          <details
            key={item.question}
            className="group rounded-card border border-line bg-surface"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden
                className="text-lg leading-none text-ink-soft transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-ink-soft">
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      <Card variant="gold">
        <h2 className="type-heading text-ink">Still need someone?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          A concern goes only to the admins. It does not appear in the feed and
          other members cannot see it.
        </p>
        <Link
          href="/help/contact"
          className="mt-4 inline-flex min-h-11 items-center rounded-soft bg-forest px-5 text-sm font-medium text-on-forest transition hover:bg-forest-hover"
        >
          Contact the admins
        </Link>
      </Card>

      <p className="text-xs leading-relaxed text-ink-soft">
        For details about what is stored and shared, read{" "}
        <Link
          href="/privacy"
          className="text-link underline-offset-4 hover:underline"
        >
          Privacy
        </Link>
        .
      </p>
    </div>
  );
}
