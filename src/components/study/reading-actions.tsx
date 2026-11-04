"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CandleLight } from "@/components/motion/candle-light";
import { CircleCandles } from "@/components/motion/circle-candles";
import { useToast } from "@/components/ui/toast";
import { setReadReceipt } from "@/lib/study/actions";

export function ReadingActions({
  planDate,
  initiallyRead,
  readCount,
  activeCount,
  catchingUp,
}: {
  planDate: string;
  initiallyRead: boolean;
  readCount: number;
  activeCount: number;
  catchingUp: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [read, setRead] = useState(initiallyRead);
  const [count, setCount] = useState(readCount);
  const [saving, setSaving] = useState(false);
  const [previous, setPrevious] = useState({ initiallyRead, readCount });

  if (
    previous.initiallyRead !== initiallyRead ||
    previous.readCount !== readCount
  ) {
    setPrevious({ initiallyRead, readCount });
    setRead(initiallyRead);
    setCount(readCount);
  }

  async function toggle(next: boolean) {
    if (saving) return;
    const previousRead = read;
    const previousCount = count;

    setSaving(true);
    setRead(next);
    setCount((current) => Math.max(0, current + (next ? 1 : -1)));

    const result = await setReadReceipt({ planDate, read: next });
    setSaving(false);

    if (!result.ok) {
      setRead(previousRead);
      setCount(previousCount);
      toast({
        title: "That wasn't saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    router.refresh();
  }

  const otherReaders = Math.max(0, count - (read ? 1 : 0));

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface-soft/45 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <CandleLight
          active={read}
          litLabel={catchingUp ? "Read this day" : "Read today"}
          unlitLabel="I read it"
          disabled={saving}
          onToggle={toggle}
        />
        <p className="text-xs leading-relaxed text-ink-soft">
          {activeCount === 0
            ? "No active members yet."
            : count === 0
              ? "No one has marked this reading yet."
              : `${count} of ${activeCount} have read ${
                  catchingUp ? "this day" : "today"
                }.`}
          {otherReaders > 0 && !read
            ? " You can still join them."
            : ""}
        </p>
      </div>

      {activeCount > 0 && activeCount <= 12 ? (
        <CircleCandles
          total={activeCount}
          lit={Math.min(count, activeCount)}
          label={catchingUp ? "Candles lit for this reading" : "Candles lit today"}
          className="self-start sm:self-auto"
        />
      ) : null}
    </div>
  );
}
