"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  createPlanFromBulk,
  createPlanFromGenerator,
  createReading,
  updateBibleSource,
} from "@/lib/study/actions";
import type { PlanView } from "@/lib/study/types";

const inputClass =
  "block min-h-11 w-full rounded-soft border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

type Mode = "single" | "paste" | "generate";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-danger">{message}</p>;
}

function ResultMessage({
  message,
  action,
}: {
  message: string | null;
  action?: { label: string; onClick: () => void };
}) {
  if (!message) return null;
  return (
    <div className="rounded-soft border border-gold/30 bg-gold-soft/55 px-4 py-3 text-sm leading-relaxed text-ink">
      <p>{message}</p>
      {action ? (
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="mt-2"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function ReadingAdmin({
  books,
  today,
  timezone,
  initialSource,
  plans,
}: {
  books: { name: string; chapters: number }[];
  today: string;
  timezone: string;
  initialSource: "biblegateway" | "youversion";
  plans: PlanView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("single");

  const [date, setDate] = useState(today);
  const [book, setBook] = useState("John");
  const [chapterStart, setChapterStart] = useState("1");
  const [chapterEnd, setChapterEnd] = useState("");
  const [savingSingle, setSavingSingle] = useState(false);
  const [singleMessage, setSingleMessage] = useState<string | null>(null);
  const [singleNeedsOverwrite, setSingleNeedsOverwrite] = useState(false);
  const [singleErrors, setSingleErrors] = useState<Record<string, string[]>>({});

  const [lines, setLines] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkNeedsOverwrite, setBulkNeedsOverwrite] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<Record<string, string[]>>({});

  const [genBook, setGenBook] = useState("John");
  const [genStartChapter, setGenStartChapter] = useState("1");
  const [genDays, setGenDays] = useState("7");
  const [genStartDate, setGenStartDate] = useState(today);
  const [savingGenerator, setSavingGenerator] = useState(false);
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null);
  const [generatorNeedsOverwrite, setGeneratorNeedsOverwrite] = useState(false);
  const [generatorErrors, setGeneratorErrors] = useState<
    Record<string, string[]>
  >({});

  const [source, setSource] = useState(initialSource);
  const [savingSource, setSavingSource] = useState(false);

  async function submitSingle(overwrite = false) {
    setSavingSingle(true);
    setSingleMessage(null);
    setSingleErrors({});

    const result = await createReading({
      date,
      book,
      chapterStart: Number(chapterStart),
      chapterEnd: chapterEnd.trim() ? Number(chapterEnd) : null,
      overwrite,
    });
    setSavingSingle(false);

    if (!result.ok) {
      setSingleMessage(result.message);
      setSingleErrors(result.fieldErrors ?? {});
      setSingleNeedsOverwrite(result.message.includes("already has a reading"));
      return;
    }

    setSingleNeedsOverwrite(false);
    setSingleMessage(null);
    toast({ title: "Reading saved", description: `${book} on ${date}.` });
    router.refresh();
  }

  async function submitBulk(overwrite = false) {
    setSavingBulk(true);
    setBulkMessage(null);
    setBulkErrors({});

    const result = await createPlanFromBulk({ lines, overwrite });
    setSavingBulk(false);

    if (!result.ok) {
      setBulkMessage(result.message);
      setBulkErrors(result.fieldErrors ?? {});
      setBulkNeedsOverwrite(result.message.includes("already have readings"));
      return;
    }

    setBulkNeedsOverwrite(false);
    setLines("");
    setBulkMessage(`${result.data.saved} readings saved.`);
    toast({
      title: "Plan saved",
      description: `${result.data.saved} readings are now scheduled.`,
    });
    router.refresh();
  }

  async function submitGenerator(overwrite = false) {
    setSavingGenerator(true);
    setGeneratorMessage(null);
    setGeneratorErrors({});

    const result = await createPlanFromGenerator({
      book: genBook,
      startChapter: Number(genStartChapter),
      days: Number(genDays),
      startDate: genStartDate,
      overwrite,
    });
    setSavingGenerator(false);

    if (!result.ok) {
      setGeneratorMessage(result.message);
      setGeneratorErrors(result.fieldErrors ?? {});
      setGeneratorNeedsOverwrite(
        result.message.includes("already have readings"),
      );
      return;
    }

    setGeneratorNeedsOverwrite(false);
    setGeneratorMessage(`${result.data.saved} readings saved.`);
    toast({
      title: "Plan generated",
      description: `${genBook} now runs for ${result.data.saved} days.`,
    });
    router.refresh();
  }

  async function changeSource(next: "biblegateway" | "youversion") {
    const previous = source;
    setSource(next);
    setSavingSource(true);
    const result = await updateBibleSource({ source: next });
    setSavingSource(false);

    if (!result.ok) {
      setSource(previous);
      toast({
        title: "Couldn't change the link source",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    toast({
      title: "Bible link source updated",
      description:
        next === "youversion" ? "YouVersion is now the default." : "BibleGateway is now the default.",
    });
    router.refresh();
  }

  function editPlan(plan: PlanView) {
    setMode("single");
    setDate(plan.date);
    setBook(plan.book);
    setChapterStart(String(plan.chapterStart));
    setChapterEnd(plan.chapterEnd === null ? "" : String(plan.chapterEnd));
    setSingleMessage(null);
    setSingleNeedsOverwrite(false);
    setSingleErrors({});
    window.setTimeout(() => {
      document
        .getElementById("single-reading")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function fieldOf(
    errors: Record<string, string[]>,
    key: string,
  ): string | undefined {
    return errors[key]?.[0];
  }

  return (
    <div className="space-y-6">
      <Card padding="md" className="bg-surface-soft/45">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Link source
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Members open the chapter. Passage text is never stored.
            </p>
          </div>
          <div className="sm:w-64">
            <SegmentedControl
              label="Bible link source"
              value={source}
              onChange={(value) =>
                changeSource(value as "biblegateway" | "youversion")
              }
              options={[
                { id: "biblegateway", label: "BibleGateway" },
                { id: "youversion", label: "YouVersion" },
              ]}
              className="grid-cols-2"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Circle timezone: {timezone}. Today is {today}.
          {savingSource ? " Saving…" : ""}
        </p>
      </Card>

      <SegmentedControl
        label="Reading plan mode"
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        options={[
          { id: "single", label: "One day" },
          { id: "paste", label: "Paste plan" },
          { id: "generate", label: "Generate" },
        ]}
        className="grid-cols-3"
      />

      {mode === "single" ? (
        <Card id="single-reading" padding="md">
          <CardHeader
            eyebrow="Single reading"
            title="Set one day"
            description="Choose a date and a chapter. Existing dates can be replaced after confirmation."
          />
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitSingle();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="reading-date" className="text-sm font-medium text-ink">
                  Date
                </label>
                <input
                  id="reading-date"
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSingleNeedsOverwrite(false);
                    setSingleMessage(null);
                  }}
                  className={inputClass}
                  required
                />
                <FieldError message={fieldOf(singleErrors, "date")} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reading-book" className="text-sm font-medium text-ink">
                  Book
                </label>
                <select
                  id="reading-book"
                  value={book}
                  onChange={(event) => {
                    setBook(event.target.value);
                    setSingleNeedsOverwrite(false);
                  }}
                  className={inputClass}
                >
                  {books.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldOf(singleErrors, "book")} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="chapter-start" className="text-sm font-medium text-ink">
                  First chapter
                </label>
                <input
                  id="chapter-start"
                  type="number"
                  min={1}
                  max={150}
                  value={chapterStart}
                  onChange={(event) => setChapterStart(event.target.value)}
                  className={inputClass}
                  required
                />
                <FieldError message={fieldOf(singleErrors, "chapterStart")} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="chapter-end" className="text-sm font-medium text-ink">
                  Last chapter <span className="text-ink-soft">(optional)</span>
                </label>
                <input
                  id="chapter-end"
                  type="number"
                  min={1}
                  max={150}
                  value={chapterEnd}
                  onChange={(event) => setChapterEnd(event.target.value)}
                  placeholder="Same as first"
                  className={inputClass}
                />
                <FieldError message={fieldOf(singleErrors, "chapterEnd")} />
              </div>
            </div>

            <ResultMessage
              message={singleMessage}
              action={
                singleNeedsOverwrite
                  ? {
                      label: "Replace the existing reading",
                      onClick: () => void submitSingle(true),
                    }
                  : undefined
              }
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={savingSingle}>
                Save reading
              </Button>
              <Link
                href="/today"
                className="inline-flex min-h-11 items-center text-sm font-medium text-link underline-offset-4 hover:underline"
              >
                Open today
              </Link>
            </div>
          </form>
        </Card>
      ) : null}

      {mode === "paste" ? (
        <Card padding="md">
          <CardHeader
            eyebrow="Paste plan"
            title="Bring a schedule"
            description="One reading per line: YYYY-MM-DD, Book Chapter. Up to 365 lines."
          />
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitBulk();
            }}
          >
            <Textarea
              label="Readings"
              value={lines}
              onChange={(event) => {
                setLines(event.target.value);
                setBulkNeedsOverwrite(false);
                setBulkMessage(null);
              }}
              hint="Example: 2026-10-26, John 1"
              placeholder={"2026-10-26, John 1\n2026-10-27, John 2\n2026-10-28, John 3"}
              rows={10}
              maxLength={12_000}
              required
            />

            {Object.keys(bulkErrors).length > 0 ? (
              <ul className="space-y-1 text-xs leading-relaxed text-danger">
                {Object.entries(bulkErrors)
                  .slice(0, 6)
                  .map(([key, messages]) => (
                    <li key={key}>
                      {key.startsWith("line:") ? `Line ${key.slice(5)}: ` : ""}
                      {messages[0]}
                    </li>
                  ))}
              </ul>
            ) : null}

            <ResultMessage
              message={bulkMessage}
              action={
                bulkNeedsOverwrite
                  ? {
                      label: "Replace the matching dates",
                      onClick: () => void submitBulk(true),
                    }
                  : undefined
              }
            />

            <Button type="submit" loading={savingBulk}>
              Save pasted plan
            </Button>
          </form>
        </Card>
      ) : null}

      {mode === "generate" ? (
        <Card padding="md">
          <CardHeader
            eyebrow="Generate plan"
            title="Walk through a book"
            description="Choose a starting chapter and a number of days. Each day gets the next chapter."
          />
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitGenerator();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="gen-book" className="text-sm font-medium text-ink">
                  Book
                </label>
                <select
                  id="gen-book"
                  value={genBook}
                  onChange={(event) => setGenBook(event.target.value)}
                  className={inputClass}
                >
                  {books.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldOf(generatorErrors, "book")} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gen-start-date" className="text-sm font-medium text-ink">
                  Start date
                </label>
                <input
                  id="gen-start-date"
                  type="date"
                  value={genStartDate}
                  onChange={(event) => setGenStartDate(event.target.value)}
                  className={inputClass}
                  required
                />
                <FieldError message={fieldOf(generatorErrors, "startDate")} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gen-chapter" className="text-sm font-medium text-ink">
                  Start chapter
                </label>
                <input
                  id="gen-chapter"
                  type="number"
                  min={1}
                  max={150}
                  value={genStartChapter}
                  onChange={(event) => setGenStartChapter(event.target.value)}
                  className={inputClass}
                  required
                />
                <FieldError message={fieldOf(generatorErrors, "startChapter")} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gen-days" className="text-sm font-medium text-ink">
                  Days
                </label>
                <input
                  id="gen-days"
                  type="number"
                  min={1}
                  max={365}
                  value={genDays}
                  onChange={(event) => setGenDays(event.target.value)}
                  className={inputClass}
                  required
                />
                <FieldError message={fieldOf(generatorErrors, "days")} />
              </div>
            </div>

            <ResultMessage
              message={generatorMessage}
              action={
                generatorNeedsOverwrite
                  ? {
                      label: "Replace the matching dates",
                      onClick: () => void submitGenerator(true),
                    }
                  : undefined
              }
            />

            <Button type="submit" loading={savingGenerator}>
              Generate readings
            </Button>
          </form>
        </Card>
      ) : null}

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="type-heading text-ink">Scheduled readings</h2>
            <p className="mt-1 text-xs text-ink-soft">
              {plans.length} saved. Future readings stay hidden from members until their day.
            </p>
          </div>
          <Link
            href="/today"
            className="text-xs font-medium text-link underline-offset-4 hover:underline"
          >
            Today
          </Link>
        </div>

        {plans.length === 0 ? (
          <p className="px-5 py-8 text-sm leading-relaxed text-ink-soft">
            No readings are scheduled yet.
          </p>
        ) : (
          <ul className="max-h-[34rem] divide-y divide-line overflow-y-auto">
            {plans.map((plan) => {
              const isToday = plan.date === today;
              const future = plan.date > today;
              return (
                <li
                  key={plan.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">
                        {plan.referenceText}
                      </p>
                      {isToday ? <Badge tone="sage">Today</Badge> : null}
                      {future ? <Badge tone="neutral">Upcoming</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">{plan.date}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editPlan(plan)}
                  >
                    Edit
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
