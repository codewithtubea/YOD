"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { sendConcern } from "@/lib/account/actions";
import type { ContactCategory } from "@/lib/account/types";

const CATEGORIES: { id: ContactCategory; label: string }[] = [
  { id: "account", label: "My account or sign-in" },
  { id: "privacy", label: "Privacy or my data" },
  { id: "content", label: "Something in the circle" },
  { id: "technical", label: "Something is not working" },
  { id: "other", label: "Something else" },
];

const inputClass =
  "block min-h-11 w-full rounded-soft border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

export function ContactForm() {
  const [category, setCategory] = useState<ContactCategory>("account");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const result = await sendConcern({ category, subject, body });
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    setSent(true);
    setSubject("");
    setBody("");
    toast({ title: "Message sent", tone: "gold" });
  }

  if (sent) {
    return (
      <div className="rounded-card border border-gold/30 bg-gold-soft/60 p-6 text-center">
        <h2 className="type-heading text-ink">The admins will see this.</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          Your message is private to the admins. There is no email reply; they
          will respond in the way that fits the concern.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="quiet" onClick={() => setSent(false)}>
            Send another
          </Button>
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center rounded-soft px-4 text-sm font-medium text-link underline-offset-4 hover:underline"
          >
            Back to help
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="concern-category" className="text-sm font-medium text-ink">
          What is this about?
        </label>
        <select
          id="concern-category"
          value={category}
          onChange={(event) => setCategory(event.target.value as ContactCategory)}
          className={`${inputClass} mt-2`}
        >
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="concern-subject" className="text-sm font-medium text-ink">
          Subject
        </label>
        <input
          id="concern-subject"
          type="text"
          value={subject}
          maxLength={120}
          required
          onChange={(event) => setSubject(event.target.value)}
          className={`${inputClass} mt-2`}
          placeholder="A short summary"
        />
        {fieldErrors.subject?.[0] ? (
          <p className="mt-1 text-xs text-danger">{fieldErrors.subject[0]}</p>
        ) : null}
      </div>

      <Textarea
        label="Message"
        value={body}
        maxLength={2000}
        rows={6}
        required
        error={fieldErrors.body?.[0]}
        hint="Only admins can read this. Do not include another member's private information."
        onChange={(event) => setBody(event.target.value)}
      />

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          Send to admins
        </Button>
        <Link
          href="/help"
          className="text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
