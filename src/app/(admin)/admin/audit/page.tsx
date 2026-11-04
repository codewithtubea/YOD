import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getAuditEntries } from "@/lib/admin/data";
import { formatAdminDateTime, humanizeAction } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Audit log" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ACTIONS = [
  "member.role_changed",
  "member.status_changed",
  "invite.created",
  "invite.accepted",
  "invite.revoked",
  "invite.updated",
  "reading.created",
  "reading.updated",
  "reading.deleted",
  "content.hidden",
  "content.unhidden",
  "report.resolved",
  "announcement.created",
  "announcement.archived",
  "announcement.updated",
  "settings.updated",
  "sermon.created",
  "sermon.updated",
] as const;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const action = first(params.action) ?? "";
  const validAction = ACTIONS.includes(action as (typeof ACTIONS)[number])
    ? action
    : "";
  const { entries, available } = await getAuditEntries(200, validAction);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Audit log"
        title="A record of care."
        description="Sensitive admin changes are recorded here. The log is append-only. Private prayer and check-in content never appears in it."
      />

      <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line pb-5">
        <div>
          <label htmlFor="audit-action" className="text-sm font-medium text-ink">
            Action
          </label>
          <select
            id="audit-action"
            name="action"
            defaultValue={validAction}
            className="mt-2 block min-h-11 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none focus:border-focus focus:ring-2 focus:ring-focus/15"
          >
            <option value="">All actions</option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {humanizeAction(value)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-xl bg-sage-soft px-4 text-sm font-medium text-ink transition hover:bg-sage/35"
        >
          Filter
        </button>
        {validAction ? (
          <a
            href="/admin/audit"
            className="inline-flex min-h-11 items-center px-2 text-sm text-ink-soft underline-offset-4 hover:underline"
          >
            Clear
          </a>
        ) : null}
      </form>

      {!available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          The audit log isn&apos;t available yet. Apply the Phase 3B migration and reload.
        </p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={24} />}
          title="Nothing recorded yet"
          description="Admin changes will appear here as they happen."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Audit log entries, newest first</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.08em] text-ink-soft">
                <th scope="col" className="py-3 pr-4 font-medium">When</th>
                <th scope="col" className="px-4 py-3 font-medium">Actor</th>
                <th scope="col" className="px-4 py-3 font-medium">Action</th>
                <th scope="col" className="px-4 py-3 font-medium">Target</th>
                <th scope="col" className="py-3 pl-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const details = Object.entries(entry.metadata).filter(
                  ([, value]) => value !== null && value !== undefined && value !== "",
                );
                return (
                  <tr key={entry.id} className="admin-row align-top">
                    <td className="whitespace-nowrap py-3 pr-4 text-xs text-ink-soft">
                      {formatAdminDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-ink">{entry.actorLabel}</td>
                    <td className="px-4 py-3">
                      <Badge tone={entry.action.includes("hidden") ? "danger" : "neutral"}>
                        {humanizeAction(entry.action)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      <span className="capitalize">{entry.targetType}</span>
                      {entry.targetId ? (
                        <span className="mt-0.5 block font-mono text-[0.625rem] text-ink-soft/70">
                          {entry.targetId.slice(0, 8)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pl-4">
                      {details.length === 0 ? (
                        <span className="text-xs text-ink-soft">—</span>
                      ) : (
                        <dl className="space-y-0.5 text-xs text-ink-soft">
                          {details.map(([key, value]) => (
                            <div key={key} className="flex flex-wrap gap-1">
                              <dt className="capitalize text-ink-soft/70">
                                {key.replaceAll("_", " ")}:
                              </dt>
                              <dd className="break-all text-ink">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink-soft">
        Showing the {entries.length} most recent {entries.length === 1 ? "entry" : "entries"}.
        The log cannot be edited or deleted from the app.
      </p>
    </div>
  );
}
