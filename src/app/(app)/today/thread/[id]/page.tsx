import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireActiveMember } from "@/lib/auth";
import { getCircleToday } from "@/lib/circle";
import { formatPlanDate } from "@/lib/date";
import { getThreadData } from "@/lib/study/data";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/study/post-card";

export const metadata: Metadata = {
  title: "Conversation",
};

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, membership } = await requireActiveMember();
  const [thread, today] = await Promise.all([
    getThreadData(id),
    getCircleToday(),
  ]);

  if (!thread?.post) notFound();

  const catchingUp = thread.plan ? thread.plan.date < today : false;
  const viewer = {
    userId,
    displayName: membership.display_name,
    role: membership.role,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={thread.plan ? `/today?date=${thread.plan.date}` : "/today"}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <span aria-hidden>←</span>
          {thread.plan ? formatPlanDate(thread.plan.date) : "Today"}
        </Link>
        {thread.plan ? (
          <Badge tone={thread.post.kind === "question" ? "gold" : "sage"}>
            {thread.post.kind === "question" ? "Question" : "Thought"}
          </Badge>
        ) : null}
        {catchingUp ? <Badge tone="sage">Catching up</Badge> : null}
      </div>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Conversation
        </p>
        <h1 className="type-title text-ink">
          {thread.plan?.referenceText ?? "This reading"}
        </h1>
      </header>

      <PostCard
        post={thread.post}
        viewer={viewer}
        canModerate={viewer.role === "admin"}
        catchingUp={catchingUp}
      />
    </div>
  );
}
