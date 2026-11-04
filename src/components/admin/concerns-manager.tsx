"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { resolveConcern } from "@/lib/admin/actions";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminConcern } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

const CATEGORY_LABELS: Record<AdminConcern["category"], string> = {
  account: "Account",
  privacy: "Privacy",
  content: "Content",
  technical: "Technical",
  other: "Other",
};

const textareaClass =
  "block min-h-28 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

type Filter = "pending" | "resolved" | "all";

export function ConcernsManager({
  concerns,
  available,
}: {
  concerns: AdminConcern[];
  available: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [active, setActive] = useState<AdminConcern | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = concerns.filter((concern) => concern.status === "new");
  const visible = concerns.filter((concern) => {
    if (filter === "all") return true;
    return filter === "pending"
      ? concern.status === "new"
      : concern.status === "resolved";
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;

    setSaving(true);
    setError(null);
    const result = await resolveConcern({
      concernId: active.id,
      note,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    toast({
      title: "Concern resolved",
      description: "The note is saved privately with the concern.",
    });
    setActive(null);
    setNote("");
    router.refresh();
  }

  return (
    <div id="concerns" className="scroll-mt-24">
      <AdminSection
        title="Messages to admins"
        description="Private concerns sent through Help. Members cannot see these or the resolution notes."
        action={
          pending.length > 0 ? (
            <Badge tone="gold">{pending.length} waiting</Badge>
          ) : null
        }
      >
        {!available ? (
          <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
            Concerns are not available yet. Apply the Phase 5B migration and
            reload.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1 border-b border-line pb-3">
              {(["pending", "resolved", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-medium capitalize transition",
                    filter === value
                      ? "bg-forest text-on-forest"
                      : "text-ink-soft hover:bg-surface-soft hover:text-ink",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="py-4 text-sm text-ink-soft">
                No {filter === "all" ? "" : `${filter} `}messages right now.
              </p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {visible.map((concern) => (
                  <li
                    key={concern.id}
                    className="flex flex-wrap items-start justify-between gap-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">
                          {CATEGORY_LABELS[concern.category]}
                        </Badge>
                        {concern.status === "resolved" ? (
                          <Badge tone="sage">Resolved</Badge>
                        ) : null}
                        <span className="text-xs text-ink-soft">
                          {formatAdminDateTime(concern.createdAt)} ·{" "}
                          {concern.authorName}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-ink">
                        {concern.subject}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                        {concern.body}
                      </p>
                      {concern.adminNote ? (
                        <p className="mt-2 border-l-2 border-sage/60 pl-3 text-xs leading-relaxed text-ink-soft">
                          Resolution: {concern.adminNote}
                        </p>
                      ) : null}
                    </div>

                    {concern.status === "new" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActive(concern);
                          setNote("");
                          setError(null);
                        }}
                      >
                        <Check aria-hidden size={15} />
                        Resolve
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </AdminSection>

      <Sheet
        open={Boolean(active)}
        onClose={() => {
          if (!saving) setActive(null);
        }}
        title="Resolve this concern"
        description="Write a short note for the record. The member is not notified automatically."
      >
        <form onSubmit={submit} className="space-y-5">
          {active ? (
            <div className="rounded-soft border border-line bg-surface-soft p-4">
              <p className="text-sm font-medium text-ink">{active.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {active.body}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="concern-resolution"
              className="block text-sm font-medium text-ink"
            >
              Resolution note
            </label>
            <textarea
              id="concern-resolution"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required
              maxLength={500}
              rows={4}
              className={textareaClass}
              placeholder="What was decided, and why?"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setActive(null)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Check aria-hidden size={15} />
              Mark resolved
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
