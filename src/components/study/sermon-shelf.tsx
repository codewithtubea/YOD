import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";

import { sermonDomain, sermonThumbnail } from "@/lib/admin/sermons";
import type { SermonLink } from "@/lib/admin/types";

function SourceLabel({ link }: { link: SermonLink }) {
  return (
    <span className="absolute left-3 top-3 rounded-full bg-canvas/90 px-2 py-0.5 text-[0.625rem] font-medium capitalize text-ink backdrop-blur">
      {link.provider === "other" ? sermonDomain(link.url) : link.provider}
    </span>
  );
}

function Thumbnail({ link }: { link: SermonLink }) {
  const thumbnail = sermonThumbnail(link.provider, link.providerId);

  return (
    <div className="relative aspect-video overflow-hidden bg-forest/90">
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt=""
          fill
          sizes="(min-width: 768px) 42rem, 100vw"
          className="object-cover transition duration-quick group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,222,163,0.28),transparent_55%)]">
          <div className="flex h-full items-center justify-center">
            {link.provider === "vimeo" ? (
              <Play aria-hidden size={32} className="text-gold/80" />
            ) : (
              <span className="font-serif text-4xl text-gold/80">
                {sermonDomain(link.url).slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
      <SourceLabel link={link} />
    </div>
  );
}

export function SermonShelf({ links }: { links: SermonLink[] }) {
  if (links.length === 0) return null;

  const [current, ...past] = links;

  return (
    <section
      id="sermons"
      aria-labelledby="sermon-shelf-title"
      className="scroll-mt-24 space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="type-label text-gold">Listening together</p>
          <h2 id="sermon-shelf-title" className="mt-1 type-section-title text-ink">
            Sermon
          </h2>
        </div>
      </div>

      <a
        href={current.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-card border border-line bg-surface/80 transition hover:border-sage/70 hover:shadow-soft"
      >
        <Thumbnail link={current} />
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-gold">
              Current sermon
            </p>
            <p className="mt-1 font-serif text-xl leading-snug text-ink">
              {current.title}
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-link">
            Open link
            <ExternalLink aria-hidden size={13} />
          </span>
        </div>
      </a>

      {past.length > 0 ? (
        <div>
          <h3 className="type-label text-ink-soft">Past sermons</h3>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {past.slice(0, 3).map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-14 items-center gap-3 py-2.5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-soft/70 text-forest">
                    <Play aria-hidden size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {link.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs capitalize text-ink-soft">
                      {link.provider === "other"
                        ? sermonDomain(link.url)
                        : link.provider}
                    </span>
                  </span>
                  <ExternalLink
                    aria-hidden
                    size={14}
                    className="shrink-0 text-ink-soft transition group-hover:text-link"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
