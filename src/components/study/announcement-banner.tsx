"use client";

import { useSyncExternalStore } from "react";
import { Megaphone, X } from "lucide-react";

import type { Announcement } from "@/lib/admin/types";

const STORAGE_KEY = "yod-dismissed-announcement";
const CHANGE_EVENT = "yod-announcement-dismissed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot() {
  return null;
}

export function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, announcement.id);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // The banner still closes when storage is unavailable.
    }
  }

  if (dismissed === announcement.id) return null;

  return (
    <aside
      aria-label="Circle announcement"
      className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gold-soft/45 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <Megaphone aria-hidden size={17} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="type-label text-gold">A note for the circle</p>
          <h2 className="mt-1 font-serif text-lg leading-snug text-ink">
            {announcement.title}
          </h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {announcement.body}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="-mr-2 -mt-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition hover:bg-surface/50 hover:text-ink"
        >
          <X aria-hidden size={16} />
        </button>
      </div>
    </aside>
  );
}
