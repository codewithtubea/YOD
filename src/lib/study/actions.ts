"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveMember, requireAdmin } from "@/lib/auth";
import { getCircleToday } from "@/lib/circle";
import { findBibleBook, formatReference, parsePlanText } from "@/lib/bible";
import { getTodayData } from "@/lib/study/data";
import { createClient } from "@/lib/supabase/server";
import {
  amenSchema,
  bibleSourceSchema,
  bulkPlanSchema,
  createPostSchema,
  createReplySchema,
  editBodySchema,
  generatePlanSchema,
  hideContentSchema,
  markAnsweredSchema,
  notificationIdSchema,
  readReceiptSchema,
  singlePlanSchema,
} from "@/lib/validation/study";
import type { ActionResult } from "@/lib/study/types";

function refresh() {
  revalidatePath("/", "layout");
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

function writeMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "We couldn't save this just now. Please try again.";
  if (error.code === "PGRST205" || error.code === "PGRST202") {
    return "The circle database isn't ready yet. Apply the Phase 3 migration first.";
  }
  if (error.code === "42501") {
    return "You don't have permission to do that.";
  }
  if (error.code === "23505") {
    return "That was already saved.";
  }
  if (error.code === "23514" || error.code === "23503") {
    return "That content didn't pass the circle's safety checks.";
  }
  return "We couldn't save this just now. Please try again.";
}

async function throttleAllowed() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("write_allowed");

  if (error) return { ok: false as const, message: writeMessage(error) };
  if (data === false) {
    return {
      ok: false as const,
      message: "You've shared a lot in a short time. Please wait a few minutes.",
    };
  }
  return { ok: true as const };
}

export async function createPost(input: {
  planDate: string;
  kind: "thought" | "question";
  body: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireActiveMember();
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your thought and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const today = await getCircleToday();
  if (parsed.data.planDate > today) {
    return { ok: false, message: "You can't post on a future reading." };
  }

  const allowed = await throttleAllowed();
  if (!allowed.ok) return allowed;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      plan_date: parsed.data.planDate,
      kind: parsed.data.kind,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function loadMorePosts(input: {
  planDate: string;
  cursor: string;
}): Promise<
  ActionResult<{
    posts: import("@/lib/study/types").PostView[];
    hasMore: boolean;
    nextCursor: string | null;
  }>
> {
  await requireActiveMember();
  const date = z.string().trim().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  const parsedDate = date.safeParse(input.planDate);
  if (!parsedDate.success) {
    return { ok: false, message: "That reading was not found." };
  }

  const [createdAt, id] = input.cursor.split("|");
  const parsedId = z.uuid().safeParse(id);
  const timestampValue = createdAt ?? "";
  const timestamp =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      timestampValue,
    ) && !Number.isNaN(Date.parse(timestampValue));
  if (!timestamp || !parsedId.success) {
    return { ok: false, message: "That page could not be loaded." };
  }

  const page = await getTodayData({
    planDate: parsedDate.data,
    cursor: { createdAt, id: parsedId.data },
  });

  if (!page.available) {
    return { ok: false, message: "The circle database isn't ready yet." };
  }

  return {
    ok: true,
    data: {
      posts: page.posts,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    },
  };
}

export async function createReply(input: {
  postId: string;
  parentReplyId?: string | null;
  body: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireActiveMember();
  const parsed = createReplySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your reply and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const allowed = await throttleAllowed();
  if (!allowed.ok) return allowed;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replies")
    .insert({
      post_id: parsed.data.postId,
      parent_reply_id: parsed.data.parentReplyId ?? null,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function editPost(input: {
  id: string;
  body: string;
}): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = editBodySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your edit and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.id)
    .eq("author_id", viewer.userId);

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function editReply(input: {
  id: string;
  body: string;
}): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = editBodySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your edit and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("replies")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.id)
    .eq("author_id", viewer.userId);

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function softDeletePost(id: string): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "That post was not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("author_id", viewer.userId);

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function softDeleteReply(id: string): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "That reply was not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("replies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("author_id", viewer.userId);

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function hidePost(input: {
  id: string;
  reason: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = hideContentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a short reason before hiding this.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_hide_content", {
    p_target_type: "post",
    p_target_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function hideReply(input: {
  id: string;
  reason: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = hideContentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a short reason before hiding this.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_hide_content", {
    p_target_type: "reply",
    p_target_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function toggleAmen(input: {
  targetType: "post" | "reply";
  targetId: string;
  active: boolean;
}): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = amenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That item was not found." };

  const supabase = await createClient();

  if (parsed.data.active) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("user_id", viewer.userId)
      .eq("target_type", parsed.data.targetType)
      .eq("target_id", parsed.data.targetId);

    if (error) return { ok: false, message: writeMessage(error) };
  } else {
    const { error } = await supabase.from("reactions").insert({
      target_type: parsed.data.targetType,
      target_id: parsed.data.targetId,
    });

    if (error && error.code !== "23505") {
      return { ok: false, message: writeMessage(error) };
    }
  }

  refresh();
  return { ok: true, data: undefined };
}

export async function setReadReceipt(input: {
  planDate: string;
  read: boolean;
}): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = readReceiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That reading was not found." };

  const today = await getCircleToday();
  if (parsed.data.planDate > today) {
    return { ok: false, message: "You can't mark a future reading." };
  }

  const supabase = await createClient();

  if (parsed.data.read) {
    const { error } = await supabase.from("read_receipts").insert({
      plan_date: parsed.data.planDate,
    });
    if (error && error.code !== "23505") {
      return { ok: false, message: writeMessage(error) };
    }
  } else {
    const { error } = await supabase
      .from("read_receipts")
      .delete()
      .eq("user_id", viewer.userId)
      .eq("plan_date", parsed.data.planDate);
    if (error) return { ok: false, message: writeMessage(error) };
  }

  refresh();
  return { ok: true, data: undefined };
}

export async function markQuestionAnswered(input: {
  postId: string;
  replyId?: string | null;
}): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = markAnsweredSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That question was not found." };

  const supabase = await createClient();
  const postResult = await supabase
    .from("posts")
    .select("author_id, kind, status")
    .eq("id", parsed.data.postId)
    .maybeSingle();

  if (postResult.error || !postResult.data) {
    return { ok: false, message: "That question was not found." };
  }

  const post = postResult.data as {
    author_id: string;
    kind: string;
    status: string;
  };

  if (post.kind !== "question") {
    return { ok: false, message: "Only questions can be marked answered." };
  }

  if (viewer.membership.role !== "admin" && post.author_id !== viewer.userId) {
    return { ok: false, message: "Only the asker or an admin can do that." };
  }

  if (parsed.data.replyId) {
    const reply = await supabase
      .from("replies")
      .select("id, post_id")
      .eq("id", parsed.data.replyId)
      .maybeSingle();

    if (
      reply.error ||
      !reply.data ||
      (reply.data as { post_id: string }).post_id !== parsed.data.postId
    ) {
      return { ok: false, message: "Choose a reply on this question." };
    }
  }

  const { error } = await supabase
    .from("posts")
    .update({
      status: "answered",
      answered_reply_id: parsed.data.replyId ?? null,
    })
    .eq("id", parsed.data.postId);

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function openNotification(formData: FormData): Promise<void> {
  const viewer = await requireActiveMember();
  const parsed = notificationIdSchema.safeParse(
    String(formData.get("id") ?? ""),
  );
  if (!parsed.success) redirect("/today");

  const supabase = await createClient();
  const result = await supabase
    .from("notifications")
    .select("type, post_id, read_at")
    .eq("id", parsed.data)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  if (result.error || !result.data) redirect("/today");

  const row = result.data as {
    type: string;
    post_id: string | null;
    read_at: string | null;
  };

  if (!row.read_at) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", parsed.data)
      .eq("user_id", viewer.userId);
  }

  refresh();

  if (row.type === "encouragement") redirect("/check-in");
  redirect(row.post_id ? `/today/thread/${row.post_id}` : "/today");
}

export async function markAllNotificationsReadForm(): Promise<void> {
  await markAllNotificationsRead();
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", viewer.userId)
    .is("read_at", null);

  if (error) return { ok: false, message: writeMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

function saveEntries(
  entries: {
    date: string;
    book: string;
    chapterStart: number;
    chapterEnd: number | null;
    referenceText: string;
  }[],
) {
  return entries.map((entry) => ({
    date: entry.date,
    book: entry.book,
    chapter_start: entry.chapterStart,
    chapter_end: entry.chapterEnd,
    reference_text: entry.referenceText,
  }));
}

export async function createReading(input: {
  date: string;
  book: string;
  chapterStart: number;
  chapterEnd?: number | null;
  overwrite?: boolean;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = singlePlanSchema.safeParse({
    date: input.date,
    book: input.book,
    chapterStart: input.chapterStart,
    chapterEnd: input.chapterEnd ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the reading and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const book = findBibleBook(parsed.data.book);
  if (!book) return { ok: false, message: "Choose a recognised Bible book." };

  const chapterEnd = parsed.data.chapterEnd ?? null;
  if (chapterEnd !== null && chapterEnd > book.chapters) {
    return {
      ok: false,
      message: `${book.name} has ${book.chapters} chapters.`,
    };
  }

  if (parsed.data.chapterStart > book.chapters) {
    return {
      ok: false,
      message: `${book.name} has ${book.chapters} chapters.`,
    };
  }

  const supabase = await createClient();

  if (!input.overwrite) {
    const existing = await supabase
      .from("reading_plan")
      .select("date")
      .eq("date", parsed.data.date)
      .maybeSingle();

    if (existing.data) {
      return {
        ok: false,
        message: "That date already has a reading. Confirm replace to overwrite it.",
      };
    }
  }

  const payload = {
    date: parsed.data.date,
    book: book.name,
    chapter_start: parsed.data.chapterStart,
    chapter_end: chapterEnd,
    reference_text: formatReference(
      book.name,
      parsed.data.chapterStart,
      chapterEnd,
    ),
  };

  const { error } = input.overwrite
    ? await supabase
        .from("reading_plan")
        .upsert(payload, { onConflict: "date" })
    : await supabase.from("reading_plan").insert(payload);

  if (error) return { ok: false, message: writeMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function createPlanFromBulk(input: {
  lines: string;
  overwrite?: boolean;
}): Promise<ActionResult<{ saved: number }>> {
  await requireAdmin();
  const parsed = bulkPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Paste at least one reading.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const result = parsePlanText(parsed.data.lines);
  if (result.errors.length > 0) {
    const errors: Record<string, string[]> = {};
    for (const error of result.errors) {
      const key = `line:${error.line}`;
      errors[key] = [...(errors[key] ?? []), error.message];
    }
    return {
      ok: false,
      message: "Some lines need attention before anything is saved.",
      fieldErrors: errors,
    };
  }

  if (result.entries.length > 365) {
    return { ok: false, message: "Add no more than 365 readings at once." };
  }

  const supabase = await createClient();
  const dates = result.entries.map((entry) => entry.date);
  const existing = await supabase
    .from("reading_plan")
    .select("date")
    .in("date", dates);

  if (existing.error) return { ok: false, message: writeMessage(existing.error) };

  const existingDates = new Set(
    ((existing.data ?? []) as unknown as { date: string }[]).map(
      (row) => row.date,
    ),
  );

  if (existingDates.size > 0 && !parsed.data.overwrite) {
    const errors: Record<string, string[]> = {};
    for (const entry of result.entries) {
      if (existingDates.has(entry.date)) {
        const key = `line:${entry.line}`;
        errors[key] = [
          ...(errors[key] ?? []),
          "This date already has a reading. Confirm replace to overwrite it.",
        ];
      }
    }
    return {
      ok: false,
      message: "Some dates already have readings. Confirm replace to overwrite them.",
      fieldErrors: errors,
    };
  }

  const payload = saveEntries(result.entries);
  const query = parsed.data.overwrite
    ? supabase.from("reading_plan").upsert(payload, { onConflict: "date" })
    : supabase.from("reading_plan").insert(payload);
  const { error } = await query;

  if (error) return { ok: false, message: writeMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: { saved: payload.length } };
}

export async function createPlanFromGenerator(input: {
  book: string;
  startChapter: number;
  days: number;
  startDate: string;
  overwrite?: boolean;
}): Promise<ActionResult<{ saved: number }>> {
  await requireAdmin();
  const parsed = generatePlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the plan details.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const book = findBibleBook(parsed.data.book);
  if (!book) return { ok: false, message: "Choose a recognised Bible book." };

  const endChapter =
    parsed.data.startChapter + parsed.data.days - 1;

  if (endChapter > book.chapters) {
    return {
      ok: false,
      message: `${book.name} has ${book.chapters} chapter${
        book.chapters === 1 ? "" : "s"
      }; this plan needs ${endChapter}.`,
    };
  }

  const lines: string[] = [];
  for (let index = 0; index < parsed.data.days; index += 1) {
    const chapter = parsed.data.startChapter + index;
    const [year, month, day] = parsed.data.startDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + index));
    const iso = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    lines.push(`${iso}, ${book.name} ${chapter}`);
  }

  return createPlanFromBulk({
    lines: lines.join("\n"),
    overwrite: parsed.data.overwrite,
  });
}

export async function updateBibleSource(input: {
  source: "biblegateway" | "youversion";
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = bibleSourceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Choose a Bible link source." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("circle_settings")
    .update({ default_bible_source: parsed.data.source })
    .eq("id", true);

  if (error) return { ok: false, message: writeMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
