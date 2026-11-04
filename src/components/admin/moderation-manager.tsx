"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Flag, RotateCcw } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import {
  hideContent,
  resolveReport,
  unhideContent,
} from "@/lib/admin/actions";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import type { AdminReport, HiddenContent } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

const REASONS: Record<AdminReport["reason"], string> = {
  unkind: "Unkind",
  unsafe: "Unsafe",
  private: "Private information",
  other: "Something else",
};

const textareaClass =
  "block min-h-28 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

export function ModerationManager({
  reports,
  hidden,
  filter,
}: {
  reports: AdminReport[];
  hidden: HiddenContent[];
  filter: "pending" | "resolved" | "all";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<AdminReport | null>(null);
  const [mode, setMode] = useState<"hide" | "resolve">("hide");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [unhiding, setUnhiding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function open(report: AdminReport, nextMode: "hide" | "resolve") {
    setReport(report);
    setMode(nextMode);
    setReason("");
    setNote("");
    setError(null);
  }

  function close() {
    if (saving) return;
    setReport(null);
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report) return;
    setSaving(true);
    setError(null);

    const result =
      mode === "hide"
        ? await hideContent({
            targetType: report.targetType,
            targetId: report.targetId,
            reason,
          })
        : await resolveReport({
            reportId: report.id,
            resolutionNote: note,
          });

    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    toast({
      title: mode === "hide" ? "Content hidden" : "Report resolved",
      description:
        mode === "hide"
          ? "It is no longer visible to members. The audit log has the reason."
          : "The note is saved with the report.",
    });
    setReport(null);
    router.refresh();
  }

  async function unhide(item: HiddenContent) {
    setUnhiding(item.id);
    const result = await unhideContent({
      targetType: item.targetType,
      targetId: item.id,
    });
    setUnhiding(null);

    if (!result.ok) {
      toast({ title: "Content not restored", description: result.message, tone: "danger" });
      return;
    }

    toast({ title: "Content restored", description: "It is visible to members again." });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-line pb-3">
        {(["pending", "resolved", "all"] as const).map((value) => (
          <a
            key={value}
            href={`/admin/moderation?status=${value}`}
            aria-current={filter === value ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-soft px-3 text-sm capitalize transition",
              filter === value
                ? "bg-sage-soft font-medium text-hed"
                : "text-ink-soft hover:bg-surface-soft hover:text-ink",
            )}
          >
            {value}
            {value === "pending" && reports.length > 0 ? (
              <span className="ml-2 rounded-full bg-gold-soft px-1.5 py-0.5 font-mono text-[0.625rem] text-gold">
                {reports.length}
              </span>
            ) : null}
          </a>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<Flag size={24} />}
          title={filter === "pending" ? "Nothing needs attention" : "No reports here"}
          description={
            filter === "pending"
              ? "Member reports will appear here. Hidden content stays below for review."
              : "No reports match this filter."
          }
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {reports.map((item) => (
            <li key={item.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.status === "pending" ? "gold" : "sage"}>
                    {item.status}
                  </Badge>
                  <Badge tone="neutral">{REASONS[item.reason]}</Badge>
                  <span className="text-xs text-ink-soft">
                    {item.targetType} · {formatAdminDate(item.targetPlanDate ?? item.createdAt)}
                  </span>
                </div>
                <span className="text-xs text-ink-soft">
                  Reported by {item.reporterName} · {formatAdminDateTime(item.createdAt)}
                </span>
              </div>

              <blockquote className="mt-4 border-l-2 border-sage/60 pl-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {item.targetBody}
                </p>
                <footer className="mt-2 text-xs text-ink-soft">
                  by {item.targetAuthor}
                  {item.targetHiddenAt ? " · hidden from members" : ""}
                </footer>
              </blockquote>

              {item.note ? (
                <p className="mt-3 text-sm text-ink-soft">
                  <span className="font-medium text-ink">Reporter&apos;s note:</span>{" "}
                  {item.note}
                </p>
              ) : null}

              {item.status === "resolved" ? (
                <p className="mt-3 rounded-lg bg-surface-soft/60 px-3 py-2 text-sm text-ink-soft">
                  Resolved {formatAdminDateTime(item.resolvedAt)}
                  {item.resolutionNote ? ` — ${item.resolutionNote}` : ""}
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {!item.targetHiddenAt ? (
                    <Button variant="danger" size="sm" onClick={() => open(item, "hide")}>
                      <EyeOff aria-hidden size={15} />
                      Hide content
                    </Button>
                  ) : (
                    <Badge tone="danger" size="md">Hidden from members</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => open(item, "resolve")}>
                    <Check aria-hidden size={15} />
                    Resolve report
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <AdminSection
        id="hidden"
        title="Hidden content"
        description="Hidden posts and replies are excluded from member queries. Restoring makes them visible again."
      >
        {hidden.length === 0 ? (
          <p className="py-4 text-sm text-ink-soft">No hidden content right now.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {hidden.map((item) => (
              <li key={`${item.targetType}-${item.id}`} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-soft">
                    {item.targetType} · {formatAdminDate(item.planDate ?? item.hiddenAt)} ·{" "}
                    {item.authorName}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink">
                    {item.body}
                  </p>
                  {item.hiddenReason ? (
                    <p className="mt-1 text-xs text-ink-soft">Reason: {item.hiddenReason}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={unhiding === item.id}
                  onClick={() => void unhide(item)}
                >
                  <RotateCcw aria-hidden size={14} />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <Sheet
        open={Boolean(report)}
        onClose={close}
        title={mode === "hide" ? "Hide this content?" : "Resolve this report"}
        description={
          mode === "hide"
            ? "Members will stop seeing it immediately. The author is not notified, and the content is not deleted."
            : "Resolve the report with a short note for the record. This does not hide the content."
        }
      >
        <form onSubmit={submit} className="space-y-5">
          {report ? (
            <blockquote className="border-l-2 border-sage/60 pl-4 text-sm leading-relaxed text-ink-soft">
              {report.targetBody}
            </blockquote>
          ) : null}

          {mode === "hide" ? (
            <div className="space-y-2">
              <label htmlFor="hide-reason" className="block text-sm font-medium text-ink">
                Why is it being hidden?
              </label>
              <textarea
                id="hide-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                maxLength={280}
                rows={4}
                className={textareaClass}
                placeholder="A short, factual reason for the audit log."
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="resolve-note" className="block text-sm font-medium text-ink">
                Resolution note
              </label>
              <textarea
                id="resolve-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                required
                maxLength={500}
                rows={4}
                className={textareaClass}
                placeholder="What was decided, and why?"
              />
            </div>
          )}

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
              {mode === "hide" ? (
                <>
                  <EyeOff aria-hidden size={15} />
                  Hide content
                </>
              ) : (
                <>
                  <Check aria-hidden size={15} />
                  Resolve
                </>
              )}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
