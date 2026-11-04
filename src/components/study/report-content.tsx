"use client";

import { useId, useState } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { reportContent } from "@/lib/study/report-actions";
import { cn } from "@/lib/cn";

const REASONS = [
  { value: "unkind", label: "Unkind", hint: "It feels harsh or dismissive." },
  { value: "unsafe", label: "Unsafe", hint: "It could harm someone." },
  { value: "private", label: "Private information", hint: "It shares what should stay private." },
  { value: "other", label: "Something else", hint: "Tell us a little more below." },
] as const;

type ReportReason = (typeof REASONS)[number]["value"];

export function ReportContent({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: "post" | "reply";
  targetId: string;
}) {
  const { toast } = useToast();
  const group = useId();
  const [reason, setReason] = useState<ReportReason>("unkind");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setReason("unkind");
    setNote("");
    setError(null);
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const result = await reportContent({ targetType, targetId, reason, note });
    setSending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    toast({
      title: "Report sent",
      description: "An admin will look at it. Thank you for caring for the circle.",
    });
    close();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!sending) close();
      }}
      title="Report this content"
      description="Reports go privately to the admins. The person will not be told who reported it."
    >
      <form onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-ink">What is happening?</legend>
          <div className="mt-3 space-y-2">
            {REASONS.map((item) => (
              <label
                key={item.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition",
                  reason === item.value
                    ? "border-focus/60 bg-sage-soft/60"
                    : "border-line bg-surface hover:bg-surface-soft/60",
                )}
              >
                <input
                  type="radio"
                  name={`report-${group}`}
                  value={item.value}
                  checked={reason === item.value}
                  onChange={() => setReason(item.value)}
                  className="mt-1 accent-forest"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{item.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor={`report-note-${group}`} className="block text-sm font-medium text-ink">
            Anything else? <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <textarea
            id={`report-note-${group}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            className="block min-h-24 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15"
            placeholder="A little context helps the admins care well."
          />
        </div>

        {error ? (
          <p role="alert" className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" variant="quiet" loading={sending}>
            <Flag aria-hidden size={15} />
            Send report
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
