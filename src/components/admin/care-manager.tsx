"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HandHeart } from "lucide-react";

import { AdminNotice, AdminSection } from "@/components/admin/page";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { sendCareNudge } from "@/lib/admin/actions";
import {
  formatAdminDate,
  formatAdminDateTime,
  relativeAdminTime,
} from "@/lib/admin/format";
import type {
  AdminCareMember,
  AdminCareSummary,
  AdminUnansweredThought,
} from "@/lib/admin/types";
import {
  formatWeekRange,
  moodLabel,
  presencePercent,
} from "@/lib/check-in/moods";

function MemberRow({ member }: { member: AdminCareMember }) {
  return (
    <li className="flex flex-wrap items-start gap-3 py-4">
      <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${member.id}`}
            className="text-sm font-medium text-ink underline-offset-4 hover:underline"
          >
            {member.displayName}
          </Link>
          <Badge tone={member.mood === "heavy" ? "gold" : "neutral"}>
            {moodLabel(member.mood)}
          </Badge>
          {member.checkedInAt ? (
            <span className="text-xs text-ink-soft">
              {formatAdminDateTime(member.checkedInAt)}
            </span>
          ) : null}
        </div>
        {member.note ? (
          <p className="mt-2 whitespace-pre-wrap border-l-2 border-sage/60 pl-3 text-sm leading-relaxed text-ink-soft">
            {member.note}
          </p>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            No note shared.
          </p>
        )}
      </div>
    </li>
  );
}

function CareGroup({
  title,
  description,
  members,
  empty,
}: {
  title: string;
  description: string;
  members: AdminCareMember[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>
      {members.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function CareManager({
  summary,
  members,
  thoughts,
  available,
}: {
  summary: AdminCareSummary | null;
  members: AdminCareMember[];
  thoughts: AdminUnansweredThought[];
  available: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const heavy = members.filter((member) => member.mood === "heavy");
  const resting = members.filter((member) => member.mood === "resting");
  const settled = members.filter(
    (member) => member.mood === "steady" || member.mood === "grateful",
  );
  const notCheckedIn = members.filter((member) => !member.checkedIn);

  async function sendNudge(thought: AdminUnansweredThought) {
    setSendingId(thought.id);
    setError(null);

    const result = await sendCareNudge({
      userId: thought.authorId,
      postId: thought.id,
    });

    setSendingId(null);

    if (!result.ok) {
      setError(result.message);
      toast({
        title: "Nudge not sent",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    toast({
      title: "Gentle nudge sent",
      description: `${thought.authorName} will see it in their bell.`,
      tone: "gold",
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {!available ? (
        <AdminNotice tone="danger" title="Care data is not ready">
          Apply the Phase 6 migration, then reload this page.
        </AdminNotice>
      ) : null}

      {summary ? (
        <AdminSection
          title="This week"
          description="Aggregate presence and the mood the circle has chosen. No member-facing names or answers leave this page."
        >
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Checked in", value: summary.checkedInCount },
              { label: "Circle", value: summary.circleSize },
              { label: "Grateful", value: summary.moods.grateful },
              { label: "Steady", value: summary.moods.steady },
              { label: "Heavy", value: summary.moods.heavy },
              { label: "Resting", value: summary.moods.resting },
            ].map((metric) => (
              <div key={metric.label} className="bg-surface px-4 py-4">
                <p className="text-xs text-ink-soft">{metric.label}</p>
                <p className="mt-2 font-serif text-2xl leading-none text-ink tabular">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-line"
            role="img"
            aria-label={`${summary.checkedInCount} of ${summary.circleSize} members have checked in`}
          >
            <div
              className="h-full rounded-full bg-gold"
              style={{
                width: `${presencePercent(
                  summary.checkedInCount,
                  summary.circleSize,
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {summary.checkedInCount} of {summary.circleSize} active members have
            checked in for the week of {formatWeekRange(summary.weekStart)}.
          </p>
        </AdminSection>
      ) : null}

      <AdminSection
        title="People, held gently"
        description="Admin-only care view. This is never a ranking or a public inactivity list."
      >
        <div className="space-y-8">
          <CareGroup
            title="Carrying something heavy"
            description="A quiet word or a prayer may be welcome. Do not ask for more than they have shared."
            members={heavy}
            empty="No one has chosen Heavy this week."
          />
          <CareGroup
            title="Resting"
            description="Low on words. A note of presence is enough."
            members={resting}
            empty="No one has chosen Resting this week."
          />
          <CareGroup
            title="Steady and grateful"
            description="Give thanks with them and leave room for the week to change."
            members={settled}
            empty="No one has checked in as steady or grateful yet."
          />
          <CareGroup
            title="Not checked in yet"
            description="No pressure. If it has been a while, a gentle nudge may help."
            members={notCheckedIn}
            empty="Everyone has checked in this week."
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Thoughts without a reply"
        description="Older thoughts that no one has answered. A gentle nudge is private and appears in the member's bell."
        action={
          thoughts.length > 0 ? (
            <Badge tone="gold">{thoughts.length} waiting</Badge>
          ) : null
        }
      >
        {error ? (
          <p className="mb-4 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {thoughts.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No unanswered thoughts right now. The circle is caught up.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {thoughts.map((thought) => (
              <li
                key={thought.id}
                className="flex flex-wrap items-start justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <Link
                      href={`/profile/${thought.authorId}`}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {thought.authorName}
                    </Link>
                    <span>·</span>
                    <span>{formatAdminDate(thought.planDate)}</span>
                    <span>·</span>
                    <span>{relativeAdminTime(thought.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {thought.body}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => sendNudge(thought)}
                  loading={sendingId === thought.id}
                  disabled={sendingId !== null}
                >
                  <HandHeart aria-hidden size={15} />
                  Send a gentle nudge
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
