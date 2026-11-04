"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Megaphone } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { archiveAnnouncement, createAnnouncement } from "@/lib/admin/actions";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import type { Announcement } from "@/lib/admin/types";

const inputClass =
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

function isLive(item: Announcement) {
  if (item.archivedAt) return false;
  if (!item.endsAt) return true;
  return new Date(item.endsAt).getTime() > Date.now();
}

export function AnnouncementManager({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<Announcement | null>(null);
  const [archiveSaving, setArchiveSaving] = useState(false);

  const live = announcements.find(isLive) ?? null;
  const history = announcements.filter((item) => item.id !== live?.id);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createAnnouncement({ title, body, endsAt });
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setTitle("");
    setBody("");
    setEndsAt("");
    toast({
      title: "Announcement is live",
      description: "It appears at the top of Today for active members.",
      tone: "gold",
    });
    router.refresh();
  }

  async function confirmArchive() {
    if (!archiving) return;
    setArchiveSaving(true);
    const result = await archiveAnnouncement(archiving.id);
    setArchiveSaving(false);
    if (!result.ok) {
      toast({ title: "Announcement not archived", description: result.message, tone: "danger" });
      return;
    }
    toast({ title: "Announcement archived" });
    setArchiving(null);
    router.refresh();
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:gap-16">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="announcement-title" className="text-sm font-medium text-ink">
            Title
          </label>
          <input
            id="announcement-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
            className={`${inputClass} mt-2`}
            placeholder="A short, clear heading"
          />
        </div>
        <div>
          <label htmlFor="announcement-body" className="text-sm font-medium text-ink">
            Message
          </label>
          <textarea
            id="announcement-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            rows={5}
            maxLength={1000}
            className={`${inputClass} mt-2 py-3`}
            placeholder="What does the circle need to know?"
          />
          <p className="mt-1 text-right font-mono text-[0.6875rem] text-ink-soft">
            {body.length}/1000
          </p>
        </div>
        <div>
          <label htmlFor="announcement-ends" className="text-sm font-medium text-ink">
            Ends on <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input
            id="announcement-ends"
            type="date"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={`${inputClass} mt-2 max-w-56`}
          />
        </div>

        {live ? (
          <p className="rounded-xl border border-gold/30 bg-gold-soft/40 px-4 py-3 text-sm leading-relaxed text-ink-soft">
            Publishing this archives the current announcement:{" "}
            <span className="font-medium text-ink">{live.title}</span>.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={saving}>
          <Megaphone aria-hidden size={16} />
          Publish announcement
        </Button>
      </form>

      <aside className="space-y-6">
        <div>
          <p className="type-label text-gold">Live now</p>
          {live ? (
            <article className="mt-3 rounded-2xl border border-line bg-surface/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-xl leading-snug text-ink">{live.title}</h3>
                <Badge tone="sage">Live</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {live.body}
              </p>
              <p className="mt-4 text-xs text-ink-soft">
                {live.endsAt ? `Until ${formatAdminDate(live.endsAt)}` : "No end date"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-3"
                onClick={() => setArchiving(live)}
              >
                <Archive aria-hidden size={14} />
                Archive
              </Button>
            </article>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              No announcement is showing on Today.
            </p>
          )}
        </div>

        <div>
          <p className="type-label text-ink-soft">Recently archived</p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Nothing archived yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {history.slice(0, 5).map((item) => (
                <li key={item.id} className="py-3">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {item.archivedAt
                      ? `Archived ${formatAdminDateTime(item.archivedAt)}`
                      : item.endsAt
                        ? `Ended ${formatAdminDate(item.endsAt)}`
                        : "Not live"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {history.length === 0 && announcements.length === 0 ? (
        <div className="lg:col-span-2">
          <AdminSection title="No announcements yet" description="A single notice can sit at the top of Today without becoming another feed.">
            <EmptyState
              icon={<Megaphone size={24} />}
              title="Nothing to announce"
              description="Use this for a change, a gathering, or a word the circle needs to hear together."
            />
          </AdminSection>
        </div>
      ) : null}

      <Sheet
        open={Boolean(archiving)}
        onClose={() => {
          if (!archiveSaving) setArchiving(null);
        }}
        title="Archive this announcement?"
        description="It will disappear from Today. The record stays here and in the audit log."
      >
        <p className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3 text-sm text-ink">
          {archiving?.title}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setArchiving(null)} disabled={archiveSaving}>
            Keep live
          </Button>
          <Button variant="danger" onClick={confirmArchive} loading={archiveSaving}>
            <Archive aria-hidden size={15} />
            Archive
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
