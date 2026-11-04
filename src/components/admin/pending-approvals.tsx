"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { approveMember } from "@/lib/admin/actions";
import type { AdminMember } from "@/lib/admin/types";

export function PendingApprovals({ members }: { members: AdminMember[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [saving, setSaving] = useState(false);

  async function approve() {
    if (!selected) return;

    setSaving(true);
    const result = await approveMember({ userId: selected.id });
    setSaving(false);

    if (!result.ok) {
      toast({
        title: "Member not approved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    toast({
      title: "Member approved",
      description: `${selected.displayName} can now enter the circle.`,
    });
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      <div className="divide-y divide-line border-y border-line">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={member.displayName} size="md" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-ink">
                    {member.displayName}
                  </p>
                  <Badge tone="gold">Waiting</Badge>
                </div>
                <p className="truncate font-mono text-xs text-ink-soft">
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Joined {new Date(member.joinedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                  {" · "}
                  No access yet
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="self-start sm:self-auto"
              onClick={() => setSelected(member)}
            >
              Review request
            </Button>
          </div>
        ))}
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => {
          if (!saving) setSelected(null);
        }}
        title={
          selected ? `Approve ${selected.displayName}?` : "Approve this member?"
        }
        description="They will be able to sign in and enter the circle. They will start with a short welcome and one chapter."
      >
        {selected ? (
          <>
            <div className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3 text-sm text-ink-soft">
              <p className="font-medium text-ink">{selected.displayName}</p>
              <p className="mt-0.5">{selected.email}</p>
              <p className="mt-1 text-xs">Requested {relativeRequestedAt(selected)}</p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Approval is quiet. No announcement is posted, and no one else is
              told. They simply become part of the circle.
            </p>
          </>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setSelected(null)}
            disabled={saving}
          >
            Not yet
          </Button>
          <Button onClick={approve} loading={saving}>
            Approve member
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function relativeRequestedAt(member: AdminMember) {
  const then = new Date(member.joinedAt).getTime();
  const days = Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));

  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(member.joinedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
