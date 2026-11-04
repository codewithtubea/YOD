import type { Metadata } from "next";
import { UserRound } from "lucide-react";

import { MemberActions } from "@/components/admin/member-actions";
import { AdminPageHeader } from "@/components/admin/page";
import { PendingApprovals } from "@/components/admin/pending-approvals";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminCounts, getAdminMembers } from "@/lib/admin/data";
import { formatAdminDate, relativeAdminTime } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/auth";
import type { MemberStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Members" };

const inputClass =
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

function statusLabel(status: MemberStatus) {
  if (status === "pending") return "Waiting approval";
  if (status === "active") return "Active";
  return "Deactivated";
}

function statusDot(status: MemberStatus) {
  if (status === "pending") return "bg-gold";
  if (status === "active") return "bg-success";
  return "bg-danger";
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { userId } = await requireAdmin();
  const params = await searchParams;
  const search = params.q ?? "";
  const [{ members, available }, { counts }] = await Promise.all([
    getAdminMembers(search),
    getAdminCounts(),
  ]);

  const pending = members.filter((member) => member.status === "pending");
  const approved = members.filter((member) => member.status !== "pending");

  return (
    <div className="space-y-10">
      <AdminPageHeader
        eyebrow="Members"
        title="The people in the circle."
        description="New requests wait here until you approve them. Roles and access stay admin-only, and deactivation is quiet, reversible, and never visible to other members."
        actions={
          <form action="/admin/members" className="flex w-full gap-2 sm:w-80">
            <label htmlFor="member-search" className="sr-only">
              Search members
            </label>
            <input
              id="member-search"
              name="q"
              defaultValue={search}
              placeholder="Name or email"
              className={inputClass}
            />
            <button
              type="submit"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-forest px-4 text-sm font-medium text-on-forest hover:bg-forest-hover"
            >
              Search
            </button>
          </form>
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-5 text-sm text-ink-soft">
        <span>
          <strong className="font-mono text-lg font-semibold text-ink tabular">
            {counts.membersActive}
          </strong>{" "}
          active
        </span>
        <span>
          <strong className="font-mono text-lg font-semibold text-ink tabular">
            {counts.membersPending}
          </strong>{" "}
          waiting
        </span>
        <span>
          <strong className="font-mono text-lg font-semibold text-ink tabular">
            {counts.admins}
          </strong>{" "}
          admin{counts.admins === 1 ? "" : "s"}
        </span>
        <span>
          <strong className="font-mono text-lg font-semibold text-ink tabular">
            {counts.membersTotal}
          </strong>{" "}
          total
        </span>
        {search ? (
          <span className="ml-auto">
            Filtered by <span className="font-medium text-ink">{search}</span>
          </span>
        ) : null}
      </div>

      {!available ? (
        <EmptyState
          icon={<UserRound size={24} />}
          title="The member list isn't available"
          description="Apply the open-registration migration, then reload this page."
        />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<UserRound size={24} />}
          title={search ? "No member matches that search" : "No members yet"}
          description={
            search
              ? "Try a different name or email address."
              : "Share the landing link. New requests will appear here for approval."
          }
        />
      ) : (
        <>
          {pending.length > 0 ? (
            <section aria-labelledby="pending-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="pending-heading"
                    className="type-section-title text-ink"
                  >
                    Waiting for approval
                  </h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">
                    They can sign in, but they only see the waiting room. Read
                    the request, then open the door when you are ready.
                  </p>
                </div>
                <Badge tone="gold">{pending.length} waiting</Badge>
              </div>
              <div className="mt-5">
                <PendingApprovals members={pending} />
              </div>
            </section>
          ) : null}

          <section aria-labelledby="members-heading">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="members-heading" className="type-section-title text-ink">
                  In the circle
                </h2>
                <p className="mt-1.5 text-sm text-ink-soft">
                  Every approved account, including deactivated members.
                </p>
              </div>
              {search ? (
                <p className="text-xs text-ink-soft">
                  Showing matches for{" "}
                  <span className="font-medium text-ink">{search}</span>
                </p>
              ) : null}
            </div>

            {approved.length === 0 ? (
              <EmptyState
                icon={<UserRound size={24} />}
                title={search ? "No approved member matches" : "No approved members yet"}
                description={
                  search
                    ? "Try a different name or email address."
                    : "Approved members will appear here."
                }
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <caption className="sr-only">
                      Circle members, their role, status, and last activity
                    </caption>
                    <thead>
                      <tr className="border-b border-line text-xs uppercase tracking-[0.08em] text-ink-soft">
                        <th scope="col" className="py-3 pr-4 font-medium">Member</th>
                        <th scope="col" className="px-4 py-3 font-medium">Role</th>
                        <th scope="col" className="px-4 py-3 font-medium">Status</th>
                        <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                        <th scope="col" className="px-4 py-3 font-medium">Last active</th>
                        <th scope="col" className="py-3 pl-4 text-right font-medium">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approved.map((member) => (
                        <tr key={member.id} className="admin-row align-middle">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={member.displayName} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">
                                  {member.displayName}
                                  {member.id === userId ? (
                                    <span className="ml-2 text-xs font-normal text-ink-soft">You</span>
                                  ) : null}
                                </p>
                                <p className="truncate font-mono text-xs text-ink-soft">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={member.role === "admin" ? "gold" : "neutral"}>
                              {member.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 text-sm text-ink">
                              <span
                                aria-hidden
                                className={`size-1.5 rounded-full ${statusDot(member.status)}`}
                              />
                              {statusLabel(member.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-soft">
                            {formatAdminDate(member.joinedAt)}
                          </td>
                          <td className="px-4 py-3 text-ink-soft">
                            {relativeAdminTime(member.lastSignInAt)}
                          </td>
                          <td className="py-3 pl-4">
                            <MemberActions
                              member={member}
                              viewerId={userId}
                              activeAdmins={counts.admins}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-line border-y border-line md:hidden">
                  {approved.map((member) => (
                    <li key={member.id} className="py-5">
                      <div className="flex items-start gap-3">
                        <Avatar name={member.displayName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-ink">{member.displayName}</p>
                            {member.id === userId ? <Badge>You</Badge> : null}
                            <Badge tone={member.role === "admin" ? "gold" : "neutral"}>
                              {member.role}
                            </Badge>
                          </div>
                          <p className="truncate font-mono text-xs text-ink-soft">{member.email}</p>
                          <p className="mt-2 text-xs text-ink-soft">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                aria-hidden
                                className={`size-1.5 rounded-full ${statusDot(member.status)}`}
                              />
                              {statusLabel(member.status)}
                            </span>
                            {" · "}Joined {formatAdminDate(member.joinedAt)}
                            {" · "}Last active {relativeAdminTime(member.lastSignInAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 border-t border-line pt-2">
                        <MemberActions
                          member={member}
                          viewerId={userId}
                          activeAdmins={counts.admins}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
