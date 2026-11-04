"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { setMemberRole, setMemberStatus } from "@/lib/admin/actions";
import type { AdminMember } from "@/lib/admin/types";

type Action = "role" | "status";

export function MemberActions({
  member,
  viewerId,
  activeAdmins,
}: {
  member: AdminMember;
  viewerId: string;
  activeAdmins: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [saving, setSaving] = useState(false);

  const isSelf = member.id === viewerId;
  const nextRole = member.role === "admin" ? "member" : "admin";
  const nextStatus = member.status === "active" ? "deactivated" : "active";
  const lastAdmin = member.role === "admin" && activeAdmins <= 1;
  const roleDisabled = isSelf || member.status !== "active" || lastAdmin;
  const statusDisabled = isSelf;

  async function saveRole() {
    setSaving(true);
    const result = await setMemberRole({ userId: member.id, role: nextRole });
    setSaving(false);

    if (!result.ok) {
      toast({ title: "Role not changed", description: result.message, tone: "danger" });
      return;
    }

    setAction(null);
    toast({
      title: nextRole === "admin" ? "Admin access granted" : "Admin access removed",
      description: `${member.displayName} is now a ${nextRole}.`,
    });
    router.refresh();
  }

  async function saveStatus() {
    setSaving(true);
    const result = await setMemberStatus({
      userId: member.id,
      status: nextStatus,
    });
    setSaving(false);

    if (!result.ok) {
      toast({
        title: "Member not updated",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setAction(null);
    toast({
      title:
        nextStatus === "deactivated"
          ? "Member deactivated"
          : "Member reactivated",
      description:
        nextStatus === "deactivated"
          ? `${member.displayName} can no longer enter the circle. Their words remain.`
          : `${member.displayName} can enter the circle again.`,
    });
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={roleDisabled}
          title={
            isSelf
              ? "You cannot change your own role."
              : lastAdmin
                ? "Keep at least one active admin."
                : member.status !== "active"
                  ? "Reactivate the member first."
                  : undefined
          }
          onClick={() => setAction("role")}
        >
          {nextRole === "admin" ? "Make admin" : "Make member"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={statusDisabled}
          title={isSelf ? "You cannot deactivate yourself." : undefined}
          onClick={() => setAction("status")}
        >
          {nextStatus === "deactivated" ? "Deactivate" : "Reactivate"}
        </Button>
      </div>

      <Sheet
        open={action === "role"}
        onClose={() => {
          if (!saving) setAction(null);
        }}
        title={nextRole === "admin" ? "Give admin access?" : "Remove admin access?"}
        description={
          nextRole === "admin"
            ? `${member.displayName} will be able to manage members, invites, readings, moderation, and settings.`
            : `${member.displayName} will keep their membership but lose access to the admin console.`
        }
      >
        <div className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3 text-sm text-ink-soft">
          <p className="font-medium text-ink">{member.displayName}</p>
          <p className="mt-0.5">{member.email}</p>
        </div>
        {lastAdmin ? (
          <p className="mt-4 text-sm text-danger">
            The circle must keep at least one active admin.
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAction(null)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveRole} loading={saving} disabled={roleDisabled}>
            {nextRole === "admin" ? "Give admin access" : "Remove admin access"}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={action === "status"}
        onClose={() => {
          if (!saving) setAction(null);
        }}
        title={
          nextStatus === "deactivated"
            ? "Deactivate this member?"
            : "Reactivate this member?"
        }
        description={
          nextStatus === "deactivated"
            ? "They will be signed out of protected data immediately. Their posts, replies, and reading history remain. You can reactivate them later."
            : "They will be able to sign in and enter the circle again."
        }
      >
        <div className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3 text-sm text-ink-soft">
          <p className="font-medium text-ink">{member.displayName}</p>
          <p className="mt-0.5">{member.email}</p>
        </div>
        {nextStatus === "deactivated" ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Care, not surveillance: deactivation is quiet and reversible. It is
            never shown to the rest of the circle.
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAction(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={nextStatus === "deactivated" ? "danger" : "primary"}
            onClick={saveStatus}
            loading={saving}
            disabled={statusDisabled}
          >
            {nextStatus === "deactivated" ? "Deactivate member" : "Reactivate member"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
