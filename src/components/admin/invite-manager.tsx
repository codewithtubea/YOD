"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MailPlus, RotateCw, Send, ShieldX } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import {
  createInvites,
  markInviteShared,
  reissueInvite,
  revokeInvite,
} from "@/lib/admin/actions";
import { buildInviteMessage } from "@/lib/admin/invites";
import { formatAdminDate, relativeAdminTime } from "@/lib/admin/format";
import type { AdminInvite } from "@/lib/admin/types";

const inputClass =
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

const STATUS_TONE = {
  pending: "gold",
  accepted: "sage",
  revoked: "neutral",
  expired: "danger",
  left: "neutral",
} as const;

function CopyButton({
  text,
  label = "Copy message",
  onCopied,
}: {
  text: string;
  label?: string;
  onCopied?: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      onCopied?.();
      toast({ title: "Invite message copied", tone: "gold" });
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Select the message text and copy it manually.",
        tone: "danger",
      });
    }
  }

  return (
    <Button variant="quiet" size="sm" onClick={copy}>
      {copied ? <Check aria-hidden size={15} /> : <Copy aria-hidden size={15} />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function InviteManager({
  invites,
  circleName,
  template,
  siteUrl,
}: {
  invites: AdminInvite[];
  circleName: string;
  template: string | null;
  siteUrl: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [note, setNote] = useState("");
  const [expiryDays, setExpiryDays] = useState("14");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string[]>([]);
  const [createdNote, setCreatedNote] = useState("");
  const [skipped, setSkipped] = useState<
    { email: string; reason: string }[]
  >([]);
  const [revoking, setRevoking] = useState<AdminInvite | null>(null);
  const [revokeSaving, setRevokeSaving] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<string | null>(null);

  const pending = invites.filter((invite) => invite.status === "pending");
  const accepted = invites.filter((invite) => invite.status === "accepted");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setCreated([]);
    setSkipped([]);

    const result = await createInvites({
      emails,
      role,
      personalNote: note,
      expiryDays: Number(expiryDays),
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setCreated(result.data.created);
    setCreatedNote(note);
    setSkipped(result.data.skipped);
    setEmails("");
    setNote("");
    toast({
      title:
        result.data.created.length === 1
          ? "Invite created"
          : `${result.data.created.length} invites created`,
      description: "Copy the message below and share it personally.",
      tone: "gold",
    });
    router.refresh();
  }

  async function resend(invite: AdminInvite) {
    setResending(invite.id);
    const message = buildInviteMessage({
      circleName,
      inviteUrl: `${siteUrl}/join?email=${encodeURIComponent(invite.email)}`,
      email: invite.email,
      personalNote: invite.personalNote,
      template,
    });

    try {
      await navigator.clipboard.writeText(message);
      await markInviteShared(invite);
      toast({ title: "Invite message copied again", tone: "gold" });
      router.refresh();
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Select the invite message and copy it manually.",
        tone: "danger",
      });
    } finally {
      setResending(null);
    }
  }

  async function renew(invite: AdminInvite) {
    setRenewing(invite.id);
    const result = await reissueInvite(invite);
    setRenewing(null);
    if (!result.ok) {
      toast({ title: "Invite not renewed", description: result.message, tone: "danger" });
      return;
    }
    toast({
      title: "Invite renewed for 14 days",
      description: "Copy the message to share it again.",
      tone: "gold",
    });
    router.refresh();
  }

  async function confirmRevoke() {
    if (!revoking) return;
    setRevokeSaving(true);
    const result = await revokeInvite(revoking.id);
    setRevokeSaving(false);

    if (!result.ok) {
      toast({ title: "Invite not revoked", description: result.message, tone: "danger" });
      return;
    }

    toast({
      title: "Invite revoked",
      description: `${revoking.email} can no longer join with this invite.`,
    });
    setRevoking(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)] lg:gap-16">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="invite-emails" className="text-sm font-medium text-ink">
              Email addresses
            </label>
            <p className="mt-1 text-xs text-ink-soft">
              One per line or separated by commas. Up to 30 at a time.
            </p>
            <textarea
              id="invite-emails"
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              rows={5}
              required
              placeholder={"ada@example.com\njohn@example.com"}
              className={`${inputClass} mt-2 py-3 font-mono text-sm`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="invite-role" className="text-sm font-medium text-ink">
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as "member" | "admin")}
                className={`${inputClass} mt-2`}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="invite-expiry" className="text-sm font-medium text-ink">
                Expires after
              </label>
              <select
                id="invite-expiry"
                value={expiryDays}
                onChange={(event) => setExpiryDays(event.target.value)}
                className={`${inputClass} mt-2`}
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="invite-note" className="text-sm font-medium text-ink">
              Personal note <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <textarea
              id="invite-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={600}
              placeholder="A line that will sit at the end of the invite message."
              className={`${inputClass} mt-2 py-3`}
            />
          </div>

          {error ? (
            <p role="alert" className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving}>
              <MailPlus aria-hidden size={17} />
              Create invite{emails.trim() ? "s" : ""}
            </Button>
            <span className="text-xs text-ink-soft">
              No email is sent. You copy and share the message yourself.
            </span>
          </div>
        </form>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-line bg-surface/60 p-5">
            <p className="type-label text-gold">How invites work</p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
              <li className="flex gap-3">
                <span className="font-mono text-xs text-gold">01</span>
                Create the invite for the exact email address.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-gold">02</span>
                Copy the message and send it personally.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-gold">03</span>
                They open the join link, use that email, and choose a password.
              </li>
            </ol>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-4 text-center">
            <div>
              <p className="font-mono text-2xl font-semibold text-ink tabular">{pending.length}</p>
              <p className="mt-1 text-xs text-ink-soft">Pending</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-ink tabular">{accepted.length}</p>
              <p className="mt-1 text-xs text-ink-soft">Accepted</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-ink tabular">{invites.length}</p>
              <p className="mt-1 text-xs text-ink-soft">Total</p>
            </div>
          </div>
        </aside>
      </div>

      {created.length > 0 || skipped.length > 0 ? (
        <div className="space-y-4 border-y border-line py-5">
          {created.length > 0 ? (
            <AdminSection
              title={created.length === 1 ? "Invite ready to share" : "Invites ready to share"}
              description="Each message uses the circle's current template and your note."
            >
              <ul className="space-y-4">
                {created.map((email) => {
                  const invite = invites.find((item) => item.email === email);
                  const message = buildInviteMessage({
                    circleName,
                    inviteUrl: `${siteUrl}/join?email=${encodeURIComponent(email)}`,
                    email,
                    personalNote: invite?.personalNote ?? createdNote,
                    template,
                  });
                  return (
                    <li key={email} className="rounded-xl border border-line bg-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-sm text-ink">{email}</p>
                        <CopyButton text={message} />
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-soft">
                        {message}
                      </pre>
                    </li>
                  );
                })}
              </ul>
            </AdminSection>
          ) : null}
          {skipped.length > 0 ? (
            <div>
              <p className="type-label text-ink-soft">Not created</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {skipped.map((item) => (
                  <li key={item.email}>
                    <span className="font-mono text-ink">{item.email}</span> — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <AdminSection
        title="Invite history"
        description="One invite per email address. Renewing keeps the previous decision in the audit log."
      >
        {invites.length === 0 ? (
          <EmptyState
            icon={<MailPlus size={24} />}
            title="No invites yet"
            description="Create the first invite above, then share the message personally."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Invites and their status</caption>
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.08em] text-ink-soft">
                    <th scope="col" className="py-3 pr-4 font-medium">Email</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Invited by</th>
                    <th scope="col" className="px-4 py-3 font-medium">Created</th>
                    <th scope="col" className="px-4 py-3 font-medium">Expires</th>
                    <th scope="col" className="py-3 pl-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => {
                    const message = buildInviteMessage({
                      circleName,
                      inviteUrl: `${siteUrl}/join?email=${encodeURIComponent(invite.email)}`,
                      email: invite.email,
                      personalNote: invite.personalNote,
                      template,
                    });
                    return (
                      <tr key={invite.id} className="admin-row align-middle">
                        <td className="py-3 pr-4">
                          <p className="font-mono text-sm text-ink">{invite.email}</p>
                          {invite.personalNote ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">
                              {invite.personalNote}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[invite.status]}>{invite.status}</Badge>
                          <p className="mt-1 text-[0.6875rem] text-ink-soft">
                            {invite.role}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{invite.invitedByName}</td>
                        <td className="px-4 py-3 text-ink-soft">
                          {formatAdminDate(invite.createdAt)}
                          {invite.lastSharedAt ? (
                            <span className="mt-0.5 block text-[0.6875rem]">
                              Shared {relativeAdminTime(invite.lastSharedAt)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          {formatAdminDate(invite.expiresAt)}
                        </td>
                        <td className="py-3 pl-4">
                          <div className="flex items-center justify-end gap-1">
                            {invite.status === "pending" ? (
                              <>
                                <CopyButton text={message} />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={resending === invite.id}
                                  onClick={() => void resend(invite)}
                                >
                                  <RotateCw aria-hidden size={14} />
                                  Share again
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRevoking(invite)}
                                >
                                  <ShieldX aria-hidden size={14} />
                                  Revoke
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                {invite.status === "accepted" ? (
                                  <span className="px-3 text-xs text-ink-soft">
                                    Accepted {formatAdminDate(invite.acceptedAt)}
                                  </span>
                                ) : invite.status === "expired" ||
                                  invite.status === "left" ? (
                                  <Button
                                    variant="quiet"
                                    size="sm"
                                    loading={renewing === invite.id}
                                    onClick={() => void renew(invite)}
                                  >
                                    <RotateCw aria-hidden size={14} />
                                    Renew
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      loading={renewing === invite.id}
                                      onClick={() => void renew(invite)}
                                    >
                                      <RotateCw aria-hidden size={14} />
                                      Renew
                                    </Button>
                                    <span className="px-2 text-xs text-ink-soft">Revoked</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line border-y border-line md:hidden">
              {invites.map((invite) => {
                const message = buildInviteMessage({
                  circleName,
                  inviteUrl: `${siteUrl}/join?email=${encodeURIComponent(invite.email)}`,
                  email: invite.email,
                  personalNote: invite.personalNote,
                  template,
                });
                return (
                  <li key={invite.id} className="py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-sm text-ink">{invite.email}</p>
                      <Badge tone={STATUS_TONE[invite.status]}>{invite.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {invite.role} · invited by {invite.invitedByName} ·{" "}
                      {formatAdminDate(invite.createdAt)}
                    </p>
                    {invite.personalNote ? (
                      <p className="mt-2 text-sm text-ink-soft">{invite.personalNote}</p>
                    ) : null}
                    {invite.status === "pending" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <CopyButton text={message} />
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={resending === invite.id}
                          onClick={() => void resend(invite)}
                        >
                          <RotateCw aria-hidden size={14} />
                          Share again
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevoking(invite)}
                        >
                          <ShieldX aria-hidden size={14} />
                          Revoke
                        </Button>
                      </div>
                    ) : invite.status === "left" ? (
                      <div className="mt-3">
                        <Button
                          variant="quiet"
                          size="sm"
                          loading={renewing === invite.id}
                          onClick={() => void renew(invite)}
                        >
                          <RotateCw aria-hidden size={14} />
                          Renew
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </AdminSection>

      <Sheet
        open={Boolean(revoking)}
        onClose={() => {
          if (!revokeSaving) setRevoking(null);
        }}
        title="Revoke this invite?"
        description={
          revoking
            ? `${revoking.email} will no longer be able to use this invite. The record stays in the audit trail.`
            : undefined
        }
      >
        <div className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3 text-sm">
          <p className="font-mono text-ink">{revoking?.email}</p>
          <p className="mt-1 text-ink-soft">
            {revoking ? `${revoking.role} · expires ${formatAdminDate(revoking.expiresAt)}` : ""}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRevoking(null)} disabled={revokeSaving}>
            Keep invite
          </Button>
          <Button variant="danger" onClick={confirmRevoke} loading={revokeSaving}>
            <Send aria-hidden size={15} />
            Revoke invite
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
