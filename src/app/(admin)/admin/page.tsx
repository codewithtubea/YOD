import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  FileClock,
  HeartHandshake,
  MailPlus,
  MessageCircleQuestion,
  ShieldAlert,
  Users,
} from "lucide-react";

import { AdminNotice, AdminPageHeader, AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getCircleSettings, getCircleToday } from "@/lib/circle";
import {
  getAdminCounts,
  getAdminQuestions,
  getAuditEntries,
  getCurrentAnnouncement,
} from "@/lib/admin/data";
import { formatAdminDate, humanizeAction, relativeAdminTime } from "@/lib/admin/format";
import { getAdminPlans } from "@/lib/study/data";

export const metadata: Metadata = { title: "Admin overview" };

function Metric({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-28 flex-col justify-between px-0 py-5 transition hover:text-forest sm:px-5 sm:first:pl-0"
    >
      <span className="type-label text-ink-soft">{label}</span>
      <span className="mt-4 font-serif text-4xl leading-none tracking-tight text-ink tabular">
        {value}
      </span>
      <span className="mt-2 text-xs text-ink-soft group-hover:text-link">
        {hint}
      </span>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const today = await getCircleToday();
  const [settings, counts, questions, audit, announcement, plans] =
    await Promise.all([
      getCircleSettings(),
      getAdminCounts(),
      getAdminQuestions("open"),
      getAuditEntries(5, ""),
      getCurrentAnnouncement(),
      getAdminPlans(),
    ]);

  const plan = plans.plans.find((item) => item.date === today) ?? null;
  const c = counts.counts;
  const attention = [
    {
      label: "Approvals waiting",
      count: c.membersPending,
      href: "/admin/members",
      detail: "Open the door for someone new.",
    },
    {
      label: "Reports waiting",
      count: c.pendingReports,
      href: "/admin/moderation",
      detail: "Read the concern, then hide or resolve.",
    },
    {
      label: "Concerns waiting",
      count: c.pendingConcerns,
      href: "/admin/moderation#concerns",
      detail: "Private messages from members, for admins only.",
    },
    {
      label: "Open questions",
      count: c.pendingQuestions,
      href: "/admin/questions",
      detail: "See what the circle is still asking.",
    },
    {
      label: "Hidden content",
      count: c.hiddenContent,
      href: "/admin/moderation#hidden",
      detail: "Review or restore content you have hidden.",
    },
    {
      label: "Invites pending",
      count: c.pendingInvites,
      href: "/admin/invites",
      detail: "Share the join link with anyone waiting.",
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        eyebrow="Admin overview"
        title="The circle, held with care."
        description={`Today is ${formatAdminDate(`${today}T12:00:00Z`)} in ${settings.timezone}. Check what needs a gentle hand, then return to the circle.`}
        actions={
          <>
            <ButtonLink href="/today" variant="quiet" size="md">
              Open Today
            </ButtonLink>
            <ButtonLink href="/admin/care" variant="quiet" size="md">
              <HeartHandshake aria-hidden size={16} />
              Care for the circle
            </ButtonLink>
            <ButtonLink href="/admin/announcements" size="md">
              Write announcement
            </ButtonLink>
          </>
        }
      />

      {!counts.available ? (
        <AdminNotice tone="danger" title="Admin data is not ready">
          Apply the Phase 3B migration, then reload this page.
        </AdminNotice>
      ) : null}

      <section aria-label="Circle at a glance" className="border-y border-line">
        <div className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
          <div className="px-0 py-1 sm:px-5 sm:first:pl-0">
            <Metric
              label="Active members"
              value={c.membersActive}
              hint={`${c.membersPending} waiting · ${c.membersTotal} total`}
              href="/admin/members"
            />
          </div>
          <div className="px-5 py-1">
            <Metric
              label="For moderation"
              value={c.pendingReports + c.pendingConcerns}
              hint="Reports and concerns"
              href="/admin/moderation"
            />
          </div>
          <div className="px-0 py-1 sm:px-5">
            <Metric
              label="Open questions"
              value={c.pendingQuestions}
              hint="Questions"
              href="/admin/questions"
            />
          </div>
          <div className="px-5 py-1">
            <Metric
              label="Waiting approval"
              value={c.membersPending}
              hint="New requests"
              href="/admin/members"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:gap-16">
        <div className="space-y-12">
          <AdminSection
            title="Needs attention"
            description="Only what is waiting. No rankings, no pressure."
          >
            {attention.length === 0 ? (
              <div className="border-l-2 border-sage py-1 pl-4">
                <p className="text-sm font-medium text-ink">Nothing is waiting.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  The circle is quiet. You can close this and return to Today.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {attention.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="group flex min-h-16 items-center gap-4 py-4"
                    >
                      <span className="tabular flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft/70 font-mono text-sm font-semibold text-gold">
                        {item.count}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden
                        size={17}
                        strokeWidth={1.5}
                        className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-link"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>

          <AdminSection
            title="Recent admin changes"
            description="Every role, reading, invite, and moderation decision is recorded."
            action={
              <Link
                href="/admin/audit"
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
              >
                Full audit log <ArrowRight aria-hidden size={15} />
              </Link>
            }
          >
            {audit.entries.length === 0 ? (
              <p className="text-sm text-ink-soft">No admin changes yet.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {audit.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 py-3.5 text-sm"
                  >
                    <FileClock
                      aria-hidden
                      size={16}
                      strokeWidth={1.5}
                      className="mt-0.5 shrink-0 text-gold"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">{humanizeAction(entry.action)}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {entry.actorLabel} · {entry.targetType}
                        {entry.targetId ? ` · ${entry.targetId.slice(0, 8)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[0.6875rem] text-ink-soft">
                      {relativeAdminTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
        </div>

        <aside className="space-y-10">
          <section className="rounded-2xl border border-line bg-surface/65 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="type-label text-gold">Today</p>
              <BookOpenText aria-hidden size={18} strokeWidth={1.5} className="text-gold" />
            </div>
            {plan ? (
              <>
                <p className="mt-4 font-serif text-2xl leading-tight text-ink">
                  {plan.referenceText}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{formatAdminDate(`${plan.date}T12:00:00Z`)}</p>
                <Link
                  href="/admin/reading"
                  className="mt-4 inline-flex min-h-9 items-center text-sm font-medium text-link underline-offset-4 hover:underline"
                >
                  Edit the plan
                </Link>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-medium text-ink">No reading set for today.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Members will see an empty Today until a reading is scheduled.
                </p>
                <Link
                  href="/admin/reading"
                  className="mt-4 inline-flex min-h-9 items-center text-sm font-medium text-link underline-offset-4 hover:underline"
                >
                  Set today&apos;s reading
                </Link>
              </>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-section-title text-ink">Announcement</h2>
              <Badge tone={announcement ? "gold" : "neutral"}>
                {announcement ? "Live" : "None"}
              </Badge>
            </div>
            {announcement ? (
              <div className="mt-3 border-l-2 border-gold/60 py-1 pl-4">
                <p className="text-sm font-medium text-ink">{announcement.title}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                  {announcement.body}
                </p>
                <p className="mt-2 text-xs text-ink-soft">
                  {relativeAdminTime(announcement.createdAt)} · {announcement.createdByName}
                </p>
                <Link
                  href="/admin/announcements"
                  className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-link underline-offset-4 hover:underline"
                >
                  Manage announcement
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                No announcement is showing on Today. Add one for a change the whole
                circle should see.
              </p>
            )}
          </section>

          <section>
            <h2 className="type-section-title text-ink">Quick actions</h2>
            <div className="mt-3 space-y-1">
              {[
                { href: "/admin/invites", label: "Invite someone", icon: MailPlus },
                { href: "/admin/reading", label: "Schedule readings", icon: BookOpenText },
                { href: "/admin/members", label: "Review members", icon: Users },
                { href: "/admin/moderation", label: "Open moderation", icon: ShieldAlert },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex min-h-10 items-center gap-3 rounded-xl px-2 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
                  >
                    <Icon aria-hidden size={17} strokeWidth={1.5} />
                    {action.label}
                  </Link>
                );
              })}
              {questions.questions.length > 0 ? (
                <Link
                  href="/admin/questions"
                  className="flex min-h-10 items-center gap-3 rounded-xl px-2 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
                >
                  <MessageCircleQuestion aria-hidden size={17} strokeWidth={1.5} />
                  {questions.questions.length} open question
                  {questions.questions.length === 1 ? "" : "s"}
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
