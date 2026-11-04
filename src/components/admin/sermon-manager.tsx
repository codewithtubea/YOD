"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, Play } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { createSermon, setSermonPublished } from "@/lib/admin/actions";
import { formatAdminDate } from "@/lib/admin/format";
import { parseSermonUrl, sermonDomain, sermonThumbnail } from "@/lib/admin/sermons";
import type { SermonLink } from "@/lib/admin/types";

const inputClass =
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

function ProviderMark({ link }: { link: SermonLink }) {
  return (
    <span className="absolute left-2 top-2 rounded-full bg-canvas/90 px-2 py-0.5 text-[0.625rem] font-medium capitalize text-ink backdrop-blur">
      {link.provider === "other" ? sermonDomain(link.url) : link.provider}
    </span>
  );
}

function Thumbnail({ link }: { link: SermonLink }) {
  const thumbnail = sermonThumbnail(link.provider, link.providerId);
  return (
    <div className="relative aspect-video overflow-hidden rounded-t-xl bg-forest/90">
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt=""
          fill
          sizes="(min-width: 768px) 45vw, 100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,222,163,0.28),transparent_55%)]">
          <div className="flex h-full items-center justify-center">
            {link.provider === "vimeo" ? (
              <Play aria-hidden size={30} className="text-gold/80" />
            ) : (
              <span className="font-serif text-3xl text-gold/80">
                {sermonDomain(link.url).slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
      <ProviderMark link={link} />
    </div>
  );
}

export function SermonManager({ links }: { links: SermonLink[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const preview = url.trim() ? parseSermonUrl(url) : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createSermon({ title, url, isPublished: true });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setTitle("");
    setUrl("");
    toast({ title: "Sermon link added", description: "It is showing on Today." });
    router.refresh();
  }

  async function toggle(link: SermonLink) {
    setToggling(link.id);
    const result = await setSermonPublished({
      id: link.id,
      isPublished: !link.isPublished,
    });
    setToggling(null);
    if (!result.ok) {
      toast({ title: "Link not updated", description: result.message, tone: "danger" });
      return;
    }
    toast({
      title: link.isPublished ? "Link hidden from Today" : "Link published",
    });
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-end">
        <div>
          <label htmlFor="sermon-title" className="text-sm font-medium text-ink">
            Title
          </label>
          <input
            id="sermon-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={140}
            className={`${inputClass} mt-2`}
            placeholder="Sunday teaching"
          />
        </div>
        <div>
          <label htmlFor="sermon-url" className="text-sm font-medium text-ink">
            Link
          </label>
          <input
            id="sermon-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            className={`${inputClass} mt-2`}
            placeholder="https://youtube.com/watch?v=…"
          />
          <p className="mt-1 text-xs text-ink-soft">
            {preview
              ? preview.provider === "other"
                ? `Shared as a ${sermonDomain(url)} link`
                : `${preview.provider} thumbnail will be used`
              : "YouTube thumbnails are generated from the link. No page fetching."}
          </p>
        </div>
        <Button type="submit" loading={saving} className="md:mb-5">
          <Link2 aria-hidden size={16} />
          Add link
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-danger md:col-span-3">
            {error}
          </p>
        ) : null}
      </form>

      <AdminSection
        title="Shared links"
        description="A small shelf on Today for sermons the circle is listening to together."
      >
        {links.length === 0 ? (
          <EmptyState
            icon={<Play size={24} />}
            title="No sermon links yet"
            description="Add a YouTube, Vimeo, or other link above. It will appear on Today once published."
          />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.id} className="overflow-hidden rounded-xl border border-line bg-surface/60">
                <Thumbnail link={link} />
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-serif text-lg leading-snug text-ink">{link.title}</h3>
                    <Badge tone={link.isPublished ? "sage" : "neutral"}>
                      {link.isPublished ? "Live" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {link.provider === "other" ? sermonDomain(link.url) : link.provider} ·{" "}
                    {formatAdminDate(link.publishedOn)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-1">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-soft px-3 text-xs font-medium text-link transition hover:bg-surface-soft"
                    >
                      <ExternalLink aria-hidden size={14} />
                      Open
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={toggling === link.id}
                      onClick={() => void toggle(link)}
                    >
                      {link.isPublished ? "Hide from Today" : "Publish"}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
